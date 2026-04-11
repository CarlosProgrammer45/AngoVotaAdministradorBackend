const { Router } = require('express');
const path = require('path');

const multer = require('multer');

const bilheteController = require('./controllers/bilheteController');

const credenciaisController = require('./controllers/credenciaisController');

const perfil = require('./controllers/perfilOficialCneController');

const utilizador = require('./controllers/utilizadorController');

const resultadoVotos = require('./controllers/votosController');

const totaisEleitores = require('./controllers/eleitoresController');

const middleware = require('./middlewares/autenticarSessao');

const routes = Router();

const candidatoController = require('./controllers/candidatoController');

//Modelo

const modeloTensor = require('./service/serviceModelo');

// Modelo Gemini 

const modeloGemini = require('./service/modeloGemini');


routes.post('/ad/verify', bilheteController.ValidarBilhetes);

routes.post('/cne/auth', perfil.buscarPerfil);

routes.post('/cne/validarKYC', perfil.validarKYC);

routes.delete('/deletar', utilizador.elimiminarUtiizador);

routes.post('/criarUsuario', perfil.CriarPerfilRapido)

routes.get('/ver', utilizador.verUtilizador);

routes.get('/criarUtilizador', utilizador.cadastrarUtilizadores);

routes.get('/resultadoVotos', middleware, resultadoVotos.MostrarVotos);

routes.post('/resultadoVotos/Provincias', resultadoVotos.MostrarVotosProvincia);

routes.post('/cne/criarBilhete', bilheteController.criarBilhete);

routes.get('/cne/criarBilheteAutomatico', bilheteController.criarBilheteAutomatico);

routes.get('/cne/apagarBilhetes', bilheteController.apagarRegistosNovos);

routes.post('/cne/MostrarEleitoresAgregados', totaisEleitores.MostrarEleitoresAgregados);

routes.get('/cne/MostrarEleitoresPorFaixaEtaria', totaisEleitores.ParticipacaoPorFaixaEtaria);

routes.get('/cne/MostrarEleitoresPorGenero', totaisEleitores.MostrarEleitoresPorGenero);

routes.get('/cne/votos/hora', resultadoVotos.VotosPorHora);

routes.get('/votos/provincia/contagem', resultadoVotos.MostrarPorProvincias);

routes.get('/VerPerfilCne', perfil.VerPerfil);

routes.post('/cne/MostrarEleitoresPorProvincia', totaisEleitores.listarEleitoresPorProvincias);



//MostrarEleitoresAgregados, ParticipacaoPorFaixaEtaria, VotosPorHora, MostrarPorProvincias, VerPerfil listarEleitoresPorProvincias criarCandidato



routes.get('/mostrarBilhetes', bilheteController.mostarBilhetes);

routes.post('/cne/eleitores', totaisEleitores.listarEleitores);


routes.post('/enviar/webauthn', credenciaisController.iniciarRegisto);
routes.post('/enviar/webauthn/verificar', credenciaisController.verificarRegisto);

// Rotas de login WebAuthn
routes.post('/enviar/webauthn/iniciar-login', credenciaisController.iniciarLogin);
routes.post('/enviar/webauthn/verificar-login', credenciaisController.verificarLogin);


//rota do candidato
routes.post('/candidatos/criar', candidatoController.criarCandidato);
routes.get('/candidato', candidatoController.listarCandidatos);
routes.get('/candidato/total/', candidatoController.totalCandidatos);


//Modelo

routes.get('/treinarModelo', modeloTensor.treinarModelo.bind(modeloTensor));
routes.get('/prever', async (req, res)=>{
    try {
        const caminhoImagem = path.join(__dirname, './dataset/validos/7967631_770x433_acf_cropped.jpg');

        const resultado = modeloTensor.prever(caminhoImagem);

        return res.json(resultado);
    } catch (error) {

        console.error(error)


        return res.status(400).json({error: 'Erro ao prever'});
        
    }
});

// Modelos Gemini

const carregarImagem = multer({dest: 'imagensCarregadas/'});

const sessoes = {};


routes.get('/analisar/imagem', carregarImagem.single('imagem'), async (req, res)=>{

    try {


        // Verifica se há algum ficheiro(imagem)

        if (!req.file) {

            console.log('Nenhuma imagem enviada');

             return res.status(400).json({ erro: "Nenhuma imagem enviada" });
        }

        const faceEnviada = req.body.face;

        const utilizadorId = req.body.utilizadorId

        const fs = require('fs');

        const sessao = sessoes[utilizadorId] || { etapa: 'frente' };

        // Verificar se o estado da sessão é diferente da foto enviada primeiro 

        

        if (sessao.etapa === 'frente' && faceEnviada !== 'frente') {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({ error: 'Tem de enviar primeiro a frente' });
        } 

        // Verificar se a segunda imagem é verso

        if (sessao.etapa === 'verso' && faceEnviada !== 'verso') {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({ error: 'Frente já tirada, agora faça com o verso' });
        }

        


        const resultado = await modeloGemini.EnviarImagem(req.file.path);

        fs.unlinkSync(req.file.path);

        if (resultado.face !==  faceEnviada) {

            console.log(`Era esperado a ${faceEnviada} mas foi enviado o ${resultado.face}`);

            return res.status(400).json({
                e_bi_Angolano: false,
                e_original: false,
                motivo: `Era esperado a ${faceEnviada} mas foi enviado o ${resultado.face}`
            });

        }

        // Atualizar o estado

        

        if (faceEnviada === 'frente') {

            sessoes[utilizadorId] = { etapa: 'verso' };

        }else{

            delete sessoes[utilizadorId];
        }

        
        
        //Apaga o ficheiro temporário
        console.log(resultado.motivo);

        return res.status(200).json(resultado);

        //const imagem = path.join(__dirname, './1.jpg');
        
        //const enviar = modeloGemini.EnviarImagem(imagem);


       // return res.send("Resultado:", enviar);

    } catch (error) {

        console.error(error)

        
        return res.status(400).json({error: 'Erro ao enviar Imagem'});
        
    }
});







module.exports = routes;
