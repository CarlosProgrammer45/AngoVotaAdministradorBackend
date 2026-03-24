const { Router } = require('express');

const bilheteController = require('./controllers/bilheteController');

const credenciaisController = require('./controllers/credenciaisController');

const perfil = require('./controllers/perfilOficialCneController');

const utilizador = require('./controllers/utilizadorController');

const resultadoVotos = require('./controllers/votosController');

const totaisEleitores = require('./controllers/eleitoresController');

const middleware = require('./middlewares/autenticarSessao');

const routes = Router();

const candidatoController = require('./controllers/candidatoController');


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





module.exports = routes;