require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');
const basicAuth = require('express-basic-auth');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // Usaremos EJS para o HTML dinâmico

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ==========================================
// 1. ROTA PÚBLICA: PÁGINA DE CONVITE
// ==========================================
app.get('/c/:chave', async (req, res) => {
    const { chave } = req.params;
    
    // Busca o convidado no banco
    const { data: convidado, error } = await supabase
        .from('convidados')
        .select('*')
        .eq('chave', chave)
        .single();

    if (error || !convidado) {
        return res.status(404).send('Convite não encontrado.');
    }

    // Renderiza a página (você criará um arquivo views/convite.ejs)
    res.render('convite', { convidado });
});

// ==========================================
// 2. ROTA PÚBLICA: PROCESSAR CONFIRMAÇÃO
// ==========================================
app.post('/confirmar', async (req, res) => {
    const { chave, resposta } = req.body;
    const vaiComparecer = resposta === 'sim';

    const { error } = await supabase
        .from('convidados')
        .update({ confirmado: vaiComparecer })
        .eq('chave', chave);

    if (error) return res.status(500).send('Erro ao salvar resposta.');

    if (vaiComparecer) {
        res.send('<h1>Presença Confirmada! Nos vemos lá! 🎉</h1>');
    } else {
        res.send('<h1>Que pena que não poderá ir. Obrigado por avisar! 💙🩷</h1>');
    }
});

// ==========================================
// 3. ROTAS ADMINISTRATIVAS (Protegidas)
// ==========================================
// Define o login e senha únicos via variáveis de ambiente
const adminAuth = basicAuth({
    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
    challenge: true
});

app.use('/admin', adminAuth);

// Dashboard Admin
app.get('/admin', async (req, res) => {
    const { data: convidados } = await supabase.from('convidados').select('*');
    res.render('admin', { convidados });
});

// Gerar novo link
app.post('/admin/gerar', async (req, res) => {
    const { nome } = req.body;
    const chave = nanoid(6); // Gera uma chave de 6 caracteres

    await supabase.from('convidados').insert([{ nome, chave }]);
    res.redirect('/admin');
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));