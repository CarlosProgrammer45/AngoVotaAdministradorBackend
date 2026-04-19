// controllers/candidatoController.js
const { candidatos } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

class CandidatoController {

  constructor() {
    this.pastaUploads = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(this.pastaUploads)) {
      fs.mkdirSync(this.pastaUploads, { recursive: true });
    }

    this.upload = this._configurarMulter();

    this.listarCandidatos     = this.listarCandidatos.bind(this);
    this.totalCandidatos      = this.totalCandidatos.bind(this);
    this.buscarCandidatoPorId = this.buscarCandidatoPorId.bind(this);
    this.criarCandidato       = this.criarCandidato.bind(this);
    this.atualizarCandidato   = this.atualizarCandidato.bind(this);
    this.apagarCandidato      = this.apagarCandidato.bind(this);
  }

  // ============================================================
  // PRIVADO — Multer
  // ============================================================

  _configurarMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, this.pastaUploads),
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext    = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${unique}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const tipos = /jpeg|jpg|png|webp|avif/;
      const extOk  = tipos.test(path.extname(file.originalname).toLowerCase());
      const mimeOk = tipos.test(file.mimetype);
      if (extOk && mimeOk) cb(null, true);
      else cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, webp, avif).'));
    };

    return multer({
      storage,
      fileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }
    }).fields([
      { name: 'foto',  maxCount: 1 },
      { name: 'fundo', maxCount: 1 }
    ]);
  }

  _apagarFicheiro(caminho) {
    if (caminho && fs.existsSync(caminho)) fs.unlinkSync(caminho);
  }

  _limparFicheirosRequest(files) {
    this._apagarFicheiro(files?.foto?.[0]?.path);
    this._apagarFicheiro(files?.fundo?.[0]?.path);
  }

  // ============================================================
  // GET /candidatos — Listar todos (com número de ordem)
  // ============================================================

  async listarCandidatos(req, res) {
    try {
      console.log('🔵 Buscando candidatos...');

      const lista = await candidatos.findAll({
        attributes: [
          'id',
          'nome',
          'partido',
          'idade',
          'foto_url',
          'slogan',
          'descricao',
          'backgroundurl',
          'criando_em'
        ],
        order: [['criando_em', 'ASC']]
      });

      const listaComNumero = lista.map((candidato, index) => ({
        ...candidato.toJSON(),
        numero: index + 1
      }));

      console.log(`✅ Encontrados ${lista.length} candidatos`);
      return res.status(200).json(listaComNumero);

    } catch (error) {
      console.error('❌ Erro ao listar candidatos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // GET /candidatos/total
  // ============================================================

  async totalCandidatos(req, res) {
    try {
      console.log('🔵 Contando candidatos...');
      const total = await candidatos.count();
      console.log(`✅ Total: ${total}`);
      return res.status(200).json({ total });
    } catch (error) {
      console.error('❌ Erro ao contar candidatos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // GET /candidatos/:id
  // ============================================================

  async buscarCandidatoPorId(req, res) {
    try {
      const { id } = req.params;

      const candidato = await candidatos.findByPk(id, {
        attributes: [
          'id', 'nome', 'partido', 'idade',
          'foto_url', 'slogan', 'descricao',
          'backgroundurl', 'criando_em'
        ]
      });

      if (!candidato) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }

      return res.status(200).json(candidato);

    } catch (error) {
      console.error('❌ Erro ao buscar candidato:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // POST /candidatos — Criar com upload de imagens
  // ============================================================

  async criarCandidato(req, res) {
    await new Promise((resolve, reject) => {
      this.upload(req, res, (erroUpload) => {
        if (erroUpload) reject(erroUpload);
        else resolve();
      });
    }).catch((erroUpload) => {
      return res.status(400).json({ error: erroUpload.message });
    });

    if (res.headersSent) return;

    const { nome, partido, idade, slogan, descricao } = req.body;

    if (!nome || !partido || !idade || !slogan || !descricao) {
      this._limparFicheirosRequest(req.files);
      return res.status(400).json({ error: 'Os campos nome, partido, idade, slogan e descricao são obrigatórios.' });
    }

    const idadeNum = Number(idade);
    if (isNaN(idadeNum) || idadeNum <= 0 || idadeNum > 120) {
      this._limparFicheirosRequest(req.files);
      return res.status(400).json({ error: 'Idade inválida.' });
    }

    if (!req.files?.foto?.[0] || !req.files?.fundo?.[0]) {
      this._limparFicheirosRequest(req.files);
      return res.status(400).json({ error: 'A foto do candidato e a imagem de fundo são obrigatórias.' });
    }

    const baseUrl  = `${req.protocol}://${req.get('host')}`;
    const fotoUrl  = `${baseUrl}/uploads/${req.files.foto[0].filename}`;
    const fundoUrl = `${baseUrl}/uploads/${req.files.fundo[0].filename}`;

    try {
      console.log('🔵 Criando candidato...');

      const novoCandidato = await candidatos.create({
        nome,
        partido,
        idade: idadeNum,
        slogan,
        descricao,
        foto_url: fotoUrl,
        backgroundurl: fundoUrl,
      });

      console.log(`✅ Candidato "${nome}" criado com sucesso`);
      return res.status(201).json({
        message: 'Candidato criado com sucesso.',
        candidato: novoCandidato,
      });

    } catch (error) {
      this._limparFicheirosRequest(req.files);
      console.error('❌ Erro ao criar candidato:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // PUT /candidatos/:id — Atualizar candidato
  // ============================================================

  async atualizarCandidato(req, res) {
    const { id } = req.params;

    // Processa upload se houver arquivos
    await new Promise((resolve, reject) => {
      this.upload(req, res, (erroUpload) => {
        if (erroUpload) reject(erroUpload);
        else resolve();
      });
    }).catch((erroUpload) => {
      return res.status(400).json({ error: erroUpload.message });
    });

    if (res.headersSent) return;

    try {
      console.log(`🔵 Buscando candidato ID ${id} para atualizar...`);
      
      const candidato = await candidatos.findByPk(id);
      
      if (!candidato) {
        this._limparFicheirosRequest(req.files);
        return res.status(404).json({ error: 'Candidato não encontrado.' });
      }

      const { nome, partido, idade, slogan, descricao } = req.body;

      // Validações
      if (!nome || !partido || !slogan || !descricao) {
        this._limparFicheirosRequest(req.files);
        return res.status(400).json({ error: 'Os campos nome, partido, slogan e descricao são obrigatórios.' });
      }

      const idadeNum = Number(idade);
      if (isNaN(idadeNum) || idadeNum <= 0 || idadeNum > 120) {
        this._limparFicheirosRequest(req.files);
        return res.status(400).json({ error: 'Idade inválida.' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let fotoUrl = candidato.foto_url;
      let fundoUrl = candidato.backgroundurl;

      // Se nova foto foi enviada, apaga a antiga e guarda a nova
      if (req.files?.foto?.[0]) {
        const nomeFotoAntiga = candidato.foto_url?.split('/uploads/')?.[1];
        if (nomeFotoAntiga) {
          this._apagarFicheiro(path.join(this.pastaUploads, nomeFotoAntiga));
        }
        fotoUrl = `${baseUrl}/uploads/${req.files.foto[0].filename}`;
      }

      // Se novo fundo foi enviado, apaga o antigo e guarda o novo
      if (req.files?.fundo?.[0]) {
        const nomeFundoAntigo = candidato.backgroundurl?.split('/uploads/')?.[1];
        if (nomeFundoAntigo) {
          this._apagarFicheiro(path.join(this.pastaUploads, nomeFundoAntigo));
        }
        fundoUrl = `${baseUrl}/uploads/${req.files.fundo[0].filename}`;
      }

      // Atualiza os dados
      await candidato.update({
        nome,
        partido,
        idade: idadeNum,
        slogan,
        descricao,
        foto_url: fotoUrl,
        backgroundurl: fundoUrl,
      });

      console.log(`✅ Candidato ID ${id} atualizado com sucesso`);
      return res.status(200).json({
        message: 'Candidato atualizado com sucesso.',
        candidato
      });

    } catch (error) {
      this._limparFicheirosRequest(req.files);
      console.error('❌ Erro ao atualizar candidato:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // DELETE /candidatos/:id
  // ============================================================

  async apagarCandidato(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔵 Apagando candidato ID ${id}...`);

      const candidato = await candidatos.findByPk(id);
      if (!candidato) {
        return res.status(404).json({ error: 'Candidato não encontrado.' });
      }

      const nomeFoto  = candidato.foto_url?.split('/uploads/')?.[1];
      const nomeFundo = candidato.backgroundurl?.split('/uploads/')?.[1];
      if (nomeFoto)  this._apagarFicheiro(path.join(this.pastaUploads, nomeFoto));
      if (nomeFundo) this._apagarFicheiro(path.join(this.pastaUploads, nomeFundo));

      await candidato.destroy();

      console.log(`✅ Candidato ID ${id} removido com sucesso`);
      return res.status(200).json({ message: 'Candidato removido com sucesso.' });

    } catch (error) {
      console.error('❌ Erro ao apagar candidato:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new CandidatoController();
