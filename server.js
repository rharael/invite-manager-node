require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');
const basicAuth = require('express-basic-auth');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // Usaremos EJS para o HTML dinâmico
app.use(express.static('public'));

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

    // Renderiza a página (arquivo views/convite.ejs)
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
        res.render('confirmado'); // Redireciona para a página confirmado.
    } else {
        res.render('negado'); // Redireciona para a página de quem não vai.
    }
});

// ==========================================
// 3. ROTAS ADMINISTRATIVAS (Protegidas)
// ==========================================
const adminAuth = basicAuth({
    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
    challenge: true
});

app.use('/admin', adminAuth);

// Nossas Listas de Presentes
const LISTA_PRESENTE_1 = ['Fralda P', 'Fralda M', 'Fralda G'];
const LISTA_PRESENTE_2 = [
    'pomada para assadura', 'lenço umedecido', 'sabonete líquido para bebê', 
    'manta para bebê unissex', 'kit de escovinha e pente para bebê', 'kit cueiro', 
    'kit de perfume para bebê', 'kit de fraldas de banho', 'toalhinha de banho', 
    'shampoo para bebê', 'naninha', 'kit manicure para bebê', 
    'kit banho (shampoo e sabonete)', 'mimo', 'termômetro para bebê', 
    'kit perfume mamãe e bebê'
];

// Dashboard Admin
app.get('/admin', async (req, res) => {
    const { data: convidados } = await supabase.from('convidados').select('*').order('id', { ascending: false });
    // Envia os convidados e as listas para o EJS montar a tela
    res.render('admin', { convidados, LISTA_PRESENTE_1, LISTA_PRESENTE_2 });
});

// Gerar novo link
app.post('/admin/gerar', async (req, res) => {
    const { nome, presente1, presente2 } = req.body;
    const chave = nanoid(6);
    await supabase.from('convidados').insert([{ nome, chave, presente1, presente2 }]);
    res.redirect('/admin');
});

// Rota para EDITAR os presentes
app.post('/admin/editar', async (req, res) => {
    const { id, presente1, presente2 } = req.body;
    await supabase.from('convidados').update({ presente1, presente2 }).eq('id', id);
    res.redirect('/admin');
});

// Rota para EXCLUIR convidado
app.post('/admin/excluir', async (req, res) => {
    const { id } = req.body;
    await supabase.from('convidados').delete().eq('id', id);
    res.redirect('/admin');
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));