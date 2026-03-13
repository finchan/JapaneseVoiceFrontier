// API Configuration
// 修改此配置以切换开发/生产环境

const TESTING        = "http://localhost:8000"                                   // Python config.py ENV = "TEST"
const PRODUCTION_DOMAIN     = "https://tasche.top:8000"         // Python config.py ENV = "PROD_DM"
const PRODUCTION_IP  = "http://118.25.106.35:8000"                    // Python config.py ENV = "PROD_IP"

const API_CONFIG = {

    baseURL: TESTING,
    
    // API 端点
    endpoints: {
        // Voice Pool
        sourcesBooks: '/api/sources/books',
        sourcesCourses: '/api/sources/courses',
        sourcesFiles: '/api/sources/files',
        sourcesLoadContent: '/api/sources/load_content',
        
        // Voice Upload
        transcribe: '/transcribe',
        
        // Voice Management
        manageFiles: '/api/manage/files',
        manageSubmit: '/api/manage/submit',
        
        // Text Submit
        convert: '/api/convert',
        
        // Word Lookup
        translateMazii: '/translate_mazii',
        
        // Verb Conjugation
        verbsSearch: '/api/verbs/search',
        verbsConjugate: '/api/verbs/conjugate',
        
        // Adjective I Conjugation
        adjectivesISearch: '/api/adjectives-i/search',
        adjectivesIConjugate: '/api/adjectives-i/conjugate',
        
        // Adjective NA Conjugation
        adjectivesNaSearch: '/api/adjectives-na/search',
        adjectivesNaConjugate: '/api/adjectives-na/conjugate',
        
        // TTS
        ttsStream: '/api/tts-stream',
    },
    
    // 辅助方法：构建完整 URL
    buildURL: function(endpoint) {
        return `${this.baseURL}${endpoint}`;
    }
};

export default API_CONFIG;
