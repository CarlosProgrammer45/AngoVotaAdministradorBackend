// controllers/candidatoController.js
const { candidatos } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary-v2');
const cloudinary = require('../config/cloudinary'); // ver config abaixo

class CandidatoController {

  constructor() {
    this.upload = this._configurarMulter();

    this.listarCandidatos     = this.listarCandidatos.bind(this);
    this.totalCandidatos      = this.totalCandidatos.bind(this);
    this.buscarCandidatoPorId = this.buscarCandidatoPorId.bind(this);
    this.criarCandidato       = this.criarCandidato.bind(this);
    this.atualizarCandidato   = this.atualizarCandidato.bind(this);
    this.apagarCandidato      = this.apagarCandidato.bind(this);
  }

  // ============================================================
  // PRIVADO — Multer + Cloudinary Storage
  // ============================================================

  _configurarMulter() {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: (req, file) => ({
        folder: 'candidatos',                          // pasta no Cloudinary
        allowed_formats: ['jpeg', 'jpg', 'png', 'webp', 'avif'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      }),
    });

    const fileFilter = (req, file, cb) => {
      const tipos = /jpeg|jpg|png|webp|avif/;
      const extOk  = tipos.test(file.originalname.split('.').pop().toLowerCase());
      const mimeOk = /image\/(jpeg|jpg|png|webp|avif)/.test(file.mimetype);
      if (extOk && mimeOk) cb(null, true);
      else cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, webp, avif).'));
    };

    return multer({
      storage,
      fileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }).fields([
      { name: 'foto',  maxCount: 1 },
      { name: 'fundo', maxCount: 1 },
    ]);
  }

  // Apaga imagem do Cloudinary pelo public_id guardado na URL
  async _apagarImagemCloudinary(url) {
    if (!url) return;
    try {
      // A URL do Cloudinary tem o formato: .../candidatos/public_id.ext
      // Precisamos extrair o public_id com a pasta
      const matches = url.match(/\/candidatos\/([^/.]+)/);
      if (matches?.[1]) {
        const publicId = `candidatos/${matches[1]}`;
        await cloudinary.uploader.destroy(publicId);
        console.log(`🗑️  Imagem Cloudinary removida: ${publicId}`);
      }
    } catch (err) {
      // Não bloqueia a operação se falhar a remoção da imagem antiga
      console.warn('⚠️  Erro ao remover imagem do Cloudinary:', err.message);
    }
  }

  async _limparFicheirosRequest(files) {
    await this._apagarImagemCloudinary(files?.foto?.[0]?.path);
    await this._apagarImagemCloudinary(files?.fundo?.[0]?.path);
  }

  _runUpload(req, res) {
    return new Promise((resolve, reject) => {
      this.upload(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ============================================================
  // GET /candidatos
  // ============================================================

  async listarCandidatos(req, res) {
    try {
      console.log('🔵 Buscando candidatos...');

      const lista = await candidatos.findAll({
        attributes: ['id', 'nome', 'partido', 'idade', 'foto_url', 'slogan', 'descricao', 'backgroundurl', 'criando_em'],
        order: [['criando_em', 'ASC']],
      });

      const listaComNumero = lista.map((c, i) => ({ ...c.toJSON(), numero: i + 1 }));

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
      const total = await candidatos.count();
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
        attributes: ['id', 'nome', 'partido', 'idade', 'foto_url', 'slogan', 'descricao', 'backgroundurl', 'criando_em'],
      });

      if (!candidato) return res.status(404).json({ error: 'Candidato não encontrado' });

      return res.status(200).json(candidato);

    } catch (error) {
      console.error('❌ Erro ao buscar candidato:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // POST /candidatos
  // ============================================================

  async criarCandidato(req, res) {
    try {
      await this._runUpload(req, res);
    } catch (erroUpload) {
      return res.status(400).json({ error: erroUpload.message });
    }

    const { nome, partido, idade, slogan, descricao } = req.body;

    if (!nome || !partido || !idade || !slogan || !descricao) {
      await this._limparFicheirosRequest(req.files);
      return res.status(400).json({ error: 'Os campos nome, partido, idade, slogan e descricao são obrigatórios.' });
    }

    const idadeNum = Number(idade);
    if (isNaN(idadeNum) || idadeNum <= 0 || idadeNum > 120) {
      await this._limparFicheirosRequest(req.files);
      return res.status(400).json({ error: 'Idade inválida.' });
    }

    if (!req.files?.foto?.[0] || !req.files?.fundo?.[0]) {
      await this._limparFicheirosRequest(req.files);
      return res.status(400).json({ error: 'A foto do candidato e a imagem de fundo são obrigatórias.' });
    }

    // O multer-storage-cloudinary guarda a URL pública em file.path
    const fotoUrl  = req.files.foto[0].path;
    const fundoUrl = req.files.fundo[0].path;

    try {
      console.log('🔵 Criando candidato...');

      const novoCandidato = await candidatos.create({
        nome, partido, idade: idadeNum, slogan, descricao,
        foto_url: fotoUrl,
        backgroundurl: fundoUrl,
      });

      console.log(`✅ Candidato "${nome}" criado com sucesso`);
      return res.status(201).json({ message: 'Candidato criado com sucesso.', candidato: novoCandidato });

    } catch (error) {
      await this._limparFicheirosRequest(req.files);
      console.error('❌ Erro ao criar candidato:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // PUT /candidatos/:id
  // ============================================================

  async atualizarCandidato(req, res) {
    const { id } = req.params;

    try {
      await this._runUpload(req, res);
    } catch (erroUpload) {
      return res.status(400).json({ error: erroUpload.message });
    }

    try {
      const candidato = await candidatos.findByPk(id);

      if (!candidato) {
        await this._limparFicheirosRequest(req.files);
        return res.status(404).json({ error: 'Candidato não encontrado.' });
      }

      const { nome, partido, idade, slogan, descricao } = req.body;

      if (!nome || !partido || !slogan || !descricao) {
        await this._limparFicheirosRequest(req.files);
        return res.status(400).json({ error: 'Os campos nome, partido, slogan e descricao são obrigatórios.' });
      }

      const idadeNum = Number(idade);
      if (isNaN(idadeNum) || idadeNum <= 0 || idadeNum > 120) {
        await this._limparFicheirosRequest(req.files);
        return res.status(400).json({ error: 'Idade inválida.' });
      }

      let fotoUrl  = candidato.foto_url;
      let fundoUrl = candidato.backgroundurl;

      // Nova foto enviada → apaga a antiga no Cloudinary, usa a nova
      if (req.files?.foto?.[0]) {
        await this._apagarImagemCloudinary(candidato.foto_url);
        fotoUrl = req.files.foto[0].path;
      }

      // Novo fundo enviado → apaga o antigo no Cloudinary, usa o novo
      if (req.files?.fundo?.[0]) {
        await this._apagarImagemCloudinary(candidato.backgroundurl);
        fundoUrl = req.files.fundo[0].path;
      }

      await candidato.update({ nome, partido, idade: idadeNum, slogan, descricao, foto_url: fotoUrl, backgroundurl: fundoUrl });

      console.log(`✅ Candidato ID ${id} atualizado com sucesso`);
      return res.status(200).json({ message: 'Candidato atualizado com sucesso.', candidato });

    } catch (error) {
      await this._limparFicheirosRequest(req.files);
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
      if (!candidato) return res.status(404).json({ error: 'Candidato não encontrado.' });

      // Remove imagens do Cloudinary antes de apagar o registo
      await this._apagarImagemCloudinary(candidato.foto_url);
      await this._apagarImagemCloudinary(candidato.backgroundurl);

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
