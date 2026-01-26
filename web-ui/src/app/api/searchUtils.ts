/**
 * Search Utilities - Tailored for Battery Process Engineer (Fath Alwi)
 * Context: Li-ion Manufacturing, Siemens Automation, CachyOS, Local LLM
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const SEARXNG_URL = process.env.SEARXNG_URL || "http://localhost:8888";

// Optional pdf-parse - may not be available on all platforms (e.g., Android/Termux)
let pdfLib: any = null;
try {
    // @ts-ignore
    pdfLib = require('pdf-parse');
} catch {
    console.warn('[Search] pdf-parse not available - PDF content extraction disabled');
}

// --- PERSONALIZED PROFILE CONSTANTS ---

const USER_SEARCH_PROFILE = `
The user is a SENIOR PROCESS ENGINEER and TECHNICAL BUILDER.
- Preferences: Technical papers (ScienceDirect, IEEE), Industrial whitepapers (Siemens, Rockwell), GitHub repos, Engineering docs, High-quality Industry News.
- AVOID: Marketing fluff, "Top 10" lists, consumer-level articles, basic tutorials (w3schools, etc.).
`;

const PREFERRED_DOMAINS = [
    // Scientific & Technical
    "sciencedirect.com", "ieee.org", "springer.com", "nature.com",
    "arxiv.org", "semanticscholar.org", "mdpi.com", "researchgate.net",

    // Industrial & Automation
    "siemens.com", "plm.automation.siemens.com", "rockwellautomation.com",
    "micron.com", "asml.com", "honeywell.com",

    // Battery & Standards
    "iso.org", "iatfglobaloversight.org", "batteryuniversity.com",

    // Code & Linux (Your Dev Stack)
    "github.com", "stackoverflow.com", "wiki.archlinux.org", "archlinux.org",
    "cachyos.org", "tibco.com", "community.tibco.com"
];

const NEWS_DOMAINS = [
    // Tech & Industry News
    "reuters.com", "bloomberg.com", "techcrunch.com", "arstechnica.com",
    "wired.com", "theverge.com", "engadget.com", "cnet.com",

    // Battery/Energy Specific
    "electrek.co", "greencarcongress.com", "cleantechnica.com", "mining.com",
    "energy-storage.news", "pv-magazine.com", "batteryindustry.net",
    "sciencedaily.com", "eurekalert.org", "phys.org", "sciencenews.org",

    // General news
    "bbc.com", "cnn.com", "apnews.com", "news.google.com"
];

// --- STRICT MODE DOMAIN BLOCKLISTS ---
const CODE_DOMAINS = ["github.com", "stackoverflow.com", "gitlab.com", "huggingface.co", "codepen.io", "replit.com"];
const INDUSTRIAL_DOMAINS = ["iso.org", "iatfglobaloversight.org", "siemens.com", "rockwellautomation.com", "honeywell.com", "nema.org"];

// --- GLOBAL BLOCKLIST (Always filtered out) ---
const BLOCKED_DOMAINS = [
    // Low-quality Q&A sites
    "baidu.com", "zhidao.baidu.com", "tieba.baidu.com",
    "quora.com", "answers.yahoo.com",
    // Social media (not useful for technical queries)
    "pinterest.com", "instagram.com", "facebook.com", "tiktok.com", "twitter.com", "x.com",
    // Basic tutorial sites (too simple for senior engineer)
    "geeksforgeeks.com", "w3schools.com", "javatpoint.com", "tutorialspoint.com",
    // Content farms
    "medium.com", "dev.to", "hashnode.com",
    // Spam/low-quality
    "copyprogramming.com", "codegrepper.com", "programmerall.com",
];

// --------------------------------------

export interface SearchResult {
    title: string;
    url: string;
    content: string;
    engine?: string;
    score?: number;
}

export interface EnrichedSearchResult extends SearchResult {
    fullContent?: string;
    domain: string;
    favicon?: string;
}

export function cleanAndParseJSON(text: string): any | null {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export interface SearchResponse {
    queries: string[];
    results: EnrichedSearchResult[];
    formattedContext: string;
}

export type SearchCategory = 'battery' | 'automation' | 'semiconductor' | 'general';

export interface DynamicSearchConfig {
    category: SearchCategory;
    preferredDomains: string[];
    scoringKeywords: string[];
    engines: string;
}

const CATEGORY_CONFIGS: Record<SearchCategory, Omit<DynamicSearchConfig, 'category'>> = {
    'battery': {
        preferredDomains: ["sciencedirect.com", "springer.com", "batteryuniversity.com", "catl.com", "electrochem.org", "nature.com"],
        scoringKeywords: ["electrode", "cathode", "anode", "electrolyte", "calendering", "coating", "capacity", "cycle life"],
        engines: "google,bing,brave,arxiv,semantic_scholar"
    },
    'automation': {
        preferredDomains: ["siemens.com", "rockwellautomation.com", "github.com", "stackoverflow.com", "inductiveautomation.com"],
        scoringKeywords: ["plc", "scada", "hmi", "modbus", "mqtt", "pid", "ladder", "structured text", "motion control"],
        engines: "google,bing,github,stack_overflow,brave"
    },
    'semiconductor': {
        preferredDomains: ["ieee.org", "asml.com", "appliedmaterials.com", "semiconductor.net", "tsmc.com"],
        scoringKeywords: ["wafer", "lithography", "etching", "deposition", "yield", "defect", "cleanroom", "node"],
        engines: "google,bing,brave,arxiv,ieee"
    },
    'general': {
        preferredDomains: PREFERRED_DOMAINS,
        scoringKeywords: ["process", "engineering", "system", "method"],
        engines: "google,bing,brave,arxiv,semantic_scholar"
    }
};

export type SearchMode = 'auto' | 'scientific' | 'industrial' | 'code' | 'general';

const MANUAL_CONFIGS: Record<Exclude<SearchMode, 'auto'>, Omit<DynamicSearchConfig, 'category'>> = {
    'scientific': {
        preferredDomains: ["sciencedirect.com", "ieee.org", "springer.com", "nature.com", "arxiv.org", "mdpi.com", "researchgate.net"],
        scoringKeywords: ["methodology", "result", "discussion", "conclusion", "experiment", "data"],
        engines: "google,bing,brave,arxiv,semantic_scholar"
    },
    'industrial': {
        preferredDomains: ["siemens.com", "rockwellautomation.com", "honeywell.com", "iso.org", "nema.org"],
        scoringKeywords: ["specification", "standard", "manual", "guide", "datasheet", "compliance"],
        engines: "google,bing,brave"
    },
    'code': {
        preferredDomains: [
            // Primary code sources
            "github.com", "stackoverflow.com", "gitlab.com",
            // Official documentation
            "readthedocs.io", "docs.python.org", "pypi.org",
            // Linux/Arch specific
            "wiki.archlinux.org", "archlinux.org", "cachyos.org",
            // Automation libraries
            "pymodbus.readthedocs.io", "pymodbustcp.readthedocs.io"
        ],
        scoringKeywords: ["error", "exception", "api", "function", "class", "install", "config", "example", "usage"],
        engines: "github,stack_overflow,google,bing"
    },
    'general': {
        preferredDomains: [...NEWS_DOMAINS, "wikipedia.org", "britannica.com"],
        scoringKeywords: ["overview", "summary", "meaning", "news", "what is"],
        engines: "google,bing,duckduckgo,wikipedia"
    }
};

// --- HELPER FUNCTIONS ---

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch { return url; }
}

/**
 * Check if domain is globally blocked (low-quality sites)
 */
function isBlockedDomain(domain: string): boolean {
    const lowerDomain = domain.toLowerCase();
    for (const blocked of BLOCKED_DOMAINS) {
        if (lowerDomain.includes(blocked)) {
            return true;
        }
    }
    return false;
}

/**
 * Global Domain Filter - Removes all blocked domains first
 */
function filterBlockedDomains(results: SearchResult[]): SearchResult[] {
    return results.filter(result => {
        const domain = extractDomain(result.url).toLowerCase();
        if (isBlockedDomain(domain)) {
            console.log(`[Filter] BLOCKED low-quality domain: ${domain}`);
            return false;
        }
        return true;
    });
}

/**
 * Strict Mode-Based Domain Filter
 * Rule 0: Always block low-quality domains (baidu, quora, etc.)
 * Rule 1: No Code domains unless mode === 'code'
 * Rule 2: No Industrial domains unless mode === 'scientific' or 'industrial'
 */
function filterResultsByMode(results: SearchResult[], searchMode: SearchMode): SearchResult[] {
    return results.filter(result => {
        const domain = extractDomain(result.url).toLowerCase();

        // Rule 0: ALWAYS block low-quality domains
        if (isBlockedDomain(domain)) {
            console.log(`[Filter] BLOCKED low-quality domain: ${domain}`);
            return false;
        }

        // Rule 1: Block CODE domains if NOT in 'code' mode
        if (searchMode !== 'code' && searchMode !== 'auto') {
            for (const codeDomain of CODE_DOMAINS) {
                if (domain.includes(codeDomain)) {
                    console.log(`[Filter] Blocked CODE domain: ${domain} (mode: ${searchMode})`);
                    return false;
                }
            }
        }

        // Rule 2: Block INDUSTRIAL domains if NOT in 'scientific' or 'industrial' mode
        if (searchMode !== 'scientific' && searchMode !== 'industrial' && searchMode !== 'auto') {
            for (const industrialDomain of INDUSTRIAL_DOMAINS) {
                if (domain.includes(industrialDomain)) {
                    console.log(`[Filter] Blocked INDUSTRIAL domain: ${domain} (mode: ${searchMode})`);
                    return false;
                }
            }
        }

        return true;
    });
}

function generalModeScore(result: SearchResult): number {
    let score = 0;
    const domain = extractDomain(result.url).toLowerCase();

    if (domain.includes("wikipedia")) score += 5;
    for (const news of NEWS_DOMAINS) {
        if (domain.includes(news)) { score += 3; break; }
    }

    if (result.title.length > 20) score += 1;
    if (result.content.length > 100) score += 1;

    return score;
}

function rankResultsGeneral(results: SearchResult[], userQuery: string): EnrichedSearchResult[] {
    const queryTerms = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    return results.map(result => {
        const domain = extractDomain(result.url).toLowerCase();
        let score = generalModeScore(result);

        queryTerms.forEach(term => {
            if (result.title.toLowerCase().includes(term)) score += 3;
            if (result.content.toLowerCase().includes(term)) score += 1;
        });

        return {
            ...result,
            domain,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            score,
        };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
}

async function classifyQuery(query: string, model: string): Promise<DynamicSearchConfig> {
    try {
        const prompt = `
${USER_SEARCH_PROFILE}

Task: Classify this query into exactly one category based on the user's engineering profile.
Query: "${query}"
Categories:
- battery (manufacturing, chemistry, storage)
- automation (controls, PLC, SCADA, software, bus/protocol)
- semiconductor (chip mfg, wafers, electronics)
- general (anything else)

Output ONLY the category name.`;

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: { temperature: 0.1, num_predict: 10 }
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.response?.trim().toLowerCase();
            if (text.includes("battery")) return { category: 'battery', ...CATEGORY_CONFIGS.battery };
            if (text.includes("automation")) return { category: 'automation', ...CATEGORY_CONFIGS.automation };
            if (text.includes("semiconductor")) return { category: 'semiconductor', ...CATEGORY_CONFIGS.semiconductor };
        }
    } catch (e) { console.error("Classification failed:", e); }

    return { category: 'general', ...CATEGORY_CONFIGS.general };
}

function isTimelyQuery(query: string): { isTimely: boolean; timeRange: string } {
    const timePatterns = [
        { pattern: /\b(today|right now|current|latest|newest)\b/i, range: 'day' },
        { pattern: /\b(this week|past week)\b/i, range: 'week' },
        { pattern: /\b(this month|recent)\b/i, range: 'month' },
        { pattern: /\b(2025|2026|forecast|trend)\b/i, range: 'year' },
    ];

    for (const { pattern, range } of timePatterns) {
        if (pattern.test(query)) {
            return { isTimely: true, timeRange: range };
        }
    }
    return { isTimely: false, timeRange: 'none' };
}

export async function generateSearchQueries(
    userQuestion: string,
    model: string = "llama3.1:8b"
): Promise<string[]> {
    const queries: string[] = [userQuestion];

    try {
        const prompt = `
${USER_SEARCH_PROFILE}

Task: Generate 2 advanced, domain-specific search queries for the user's question.
- If technical, use precise engineering terminology.
- If coding, include specific library names (e.g., pandas, plc-handler).

Question: "${userQuestion}"
Output only the queries, one per line.`;

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: { temperature: 0.3, num_predict: 60 }
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const generated = data.response
                .split('\n')
                .map((q: string) => q.replace(/^[\d\-\*\.]+\s*/, '').trim())
                .filter((q: string) => q.length > 5 && q.length < 100);

            queries.push(...generated.slice(0, 2));
        }
    } catch (error) {
        console.error("Query generation error:", error);
    }

    console.log("[Search] Generated queries:", queries);
    return queries;
}

export async function executeSearch(
    query: string,
    engines: string = "google,bing,arxiv,github,stack_overflow",
    timeRange: string = "none"
): Promise<SearchResult[]> {
    const engineSets = [
        engines,
        "brave",
        "duckduckgo",
        "",
    ];

    for (const engineSet of engineSets) {
        try {
            let searchUrl = `${SEARXNG_URL}/search?q=${encodeURIComponent(query)}&format=json`;
            if (engineSet) searchUrl += `&engines=${engineSet}`;
            if (timeRange !== "none") searchUrl += `&time_range=${timeRange}`;

            console.log(`[Search] Trying engines: ${engineSet || 'default'} for query: "${query}"`);

            const timeout = engineSet === engines ? 6000 : 15000;

            const response = await fetch(searchUrl, {
                headers: { "Accept": "application/json" },
                signal: AbortSignal.timeout(timeout),
            });

            if (!response.ok) {
                console.warn(`[Search] Engine set "${engineSet}" failed with status ${response.status}`);
                continue;
            }

            const data = await response.json();
            let results = (data.results || []).map((r: any) => ({
                title: r.title || "",
                url: r.url || "",
                content: r.content || "",
                engine: r.engine || "unknown",
            }));

            // IMMEDIATELY filter out blocked domains (baidu, quora, etc.)
            const beforeCount = results.length;
            results = filterBlockedDomains(results);
            const filteredCount = beforeCount - results.length;
            if (filteredCount > 0) {
                console.log(`[Search] Filtered out ${filteredCount} blocked domains`);
            }

            if (results.length > 0) {
                console.log(`[Search] Success with engines: ${engineSet || 'default'}, found ${results.length} usable results`);
                return results;
            }

            console.warn(`[Search] Engine set "${engineSet}" returned 0 usable results after filtering`);
        } catch (error) {
            console.error(`[Search] Error with engines "${engineSet}":`, error);
        }
    }

    console.error(`[Search] All engine attempts failed for query: "${query}"`);
    return [];
}

function isResultRelevant(result: SearchResult, userQuery: string, strictMode: boolean = true): boolean {
    const combinedText = `${result.title} ${result.content}`.toLowerCase();
    const queryLower = userQuery.toLowerCase();
    const domain = extractDomain(result.url).toLowerCase();

    const isWhiteListed = [...PREFERRED_DOMAINS, ...NEWS_DOMAINS].some(d => domain.includes(d));
    if (isWhiteListed) return true;

    const noisePatterns = [
        /buy cheap|discount|promo code|coupon/i,
        /best\s+\w+\s+reviews\s+20\d\d/i,
        /top\s+10\s+reasons/i,
        /beginners guide to/i,
        /simple explanation of/i,
        /pinterest\.com|instagram\.com|facebook\.com|tiktok\.com/i,
        /quora\.com/i,
        /geeksforgeeks|w3schools|javatpoint/i
    ];

    if (strictMode) {
        for (const pattern of noisePatterns) {
            if (pattern.test(combinedText) || pattern.test(result.url)) return false;
        }
    }

    if (/jakarta/i.test(queryLower) && !/java|code|software/i.test(queryLower)) {
        if (/jakarta\s*(ee|enterprise|servlet)/i.test(combinedText)) return false;
    }

    return true;
}

function engineeringScore(result: SearchResult): number {
    let score = 0;
    const domain = (result.url || "").toLowerCase();
    const text = `${result.title} ${result.content}`.toLowerCase();

    if (domain.includes("ieee")) score += 3;
    if (domain.includes("springer")) score += 3;
    if (domain.includes("arxiv")) score += 2.5;
    if (domain.includes("github")) score += 2;
    if (domain.includes("siemens")) score += 2;
    if (domain.includes("sciencedirect")) score += 3;

    if (text.length < 250) score -= 1;
    if (text.includes("ultimate guide")) score -= 2;
    if (text.includes("top 10")) score -= 2;

    return score;
}

export function rankResults(results: SearchResult[], userQuery: string, strictMode: boolean = true): EnrichedSearchResult[] {
    const { isTimely } = isTimelyQuery(userQuery);

    const scored = results.map(result => {
        const domain = extractDomain(result.url).toLowerCase();

        let score = engineeringScore(result);

        for (const preferred of PREFERRED_DOMAINS) {
            if (domain.includes(preferred)) {
                score += 10;
                break;
            }
        }

        if (isTimely) {
            for (const news of NEWS_DOMAINS) {
                if (domain.includes(news)) {
                    score += 15;
                    break;
                }
            }
        }

        const queryTerms = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        queryTerms.forEach(term => {
            if (result.title.toLowerCase().includes(term)) score += 5;
            if (result.content.toLowerCase().includes(term)) score += 2;
        });

        if (result.url.endsWith('.pdf')) score += 5;
        if (result.url.includes('docs') || result.url.includes('manual')) score += 3;

        return {
            ...result,
            domain,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            score,
        };
    });

    return scored
        .filter(r => isResultRelevant(r, userQuery, strictMode))
        .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function reRankWithFullContent(results: EnrichedSearchResult[], userQuery: string, config: DynamicSearchConfig): EnrichedSearchResult[] {
    console.log("[Search] Re-ranking with full content...");
    const queryTerms = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scored = results.map(result => {
        let score = result.score || 0;
        const text = (result.fullContent || result.content || "").toLowerCase();
        const domain = (result.domain || "").toLowerCase();

        for (const pref of config.preferredDomains) {
            if (domain.includes(pref)) {
                score += 3;
                break;
            }
        }

        for (const kw of config.scoringKeywords) {
            if (text.includes(kw)) score += 0.5;
        }

        if (text.length < 300) score -= 1;
        if (text.includes("ultimate guide") || text.includes("top 10")) score -= 2;

        if (text.length > 200) {
            let matchCount = 0;
            queryTerms.forEach(term => {
                const matches = text.split(term).length - 1;
                matchCount += matches;
            });
            score += Math.min(matchCount, 15);

            if (text.includes("specification") || text.includes("data sheet") || text.includes("parameter")) score += 3;
            if (/\d+/.test(text)) score += 1;
        }

        return { ...result, score };
    });

    return scored.sort((a, b) => (b.score || 0) - (a.score || 0));
}

async function fetchPageContentMobile(url: string): Promise<string | null> {
    console.log(`[Search] Mobile fetch for: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
                'Accept': 'text/html'
            },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) return null;
        const html = await response.text();
        return html.replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000);
    } catch {
        return null;
    }
}

export async function fetchPageContent(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/'
            },
            signal: AbortSignal.timeout(10000),
        });

        if (response.status === 403 || response.status === 401) {
            console.warn(`[Search] Access denied (${response.status}) for ${url}. Using mobile fallback...`);
            return await fetchPageContentMobile(url);
        }

        if (!response.ok) return null;

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/pdf') || url.endsWith('.pdf')) {
            // Skip PDF parsing if pdf-parse is not available
            if (!pdfLib) {
                console.warn(`[Search] PDF parsing skipped (pdf-parse not available) for ${url}`);
                return null;
            }
            const buffer = await response.arrayBuffer();
            const parser = (pdfLib as any).default || pdfLib;
            const data = await parser(Buffer.from(buffer));
            return data.text.substring(0, 5000);
        }

        const html = await response.text();

        if (html.length < 500 || html.includes("JavaScript is needed")) {
            console.warn(`[Search] Content seems empty or requires JS for ${url}. Using mobile fallback...`);
            return await fetchPageContentMobile(url);
        }

        const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return text.substring(0, 3000);
    } catch (e) {
        console.warn(`[Search] Fetch failed for ${url}. Using mobile fallback...`);
        return await fetchPageContentMobile(url);
    }
}

export async function summarizeContent(content: string, userQuery: string, model: string): Promise<string> {
    if (!content || content.length < 100) return content;

    try {
        const prompt = `Analyze this text and extract detailed information relevant to: "${userQuery}"

Text: ${content.substring(0, 2500)}

Instructions:
- Extract key facts, dates, figures, and technical details.
- Provide a comprehensive summary (4-6 bullet points).
- Focus on "New" or "Future" developments if the query asks for them.
- Ignore navigation links or ads.

Summary:`;

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    num_predict: 300,
                    num_ctx: 4096
                }
            }),
        });

        if (!response.ok) return content.substring(0, 300);
        const data = await response.json();
        return data.response?.trim() || content.substring(0, 300);
    } catch { return content.substring(0, 300); }
}

const IGNORE_WORDS = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'of', 'for', 'it', 'with', 'as', 'by']);

function extractRelevantContext(content: string, query: string, maxLength: number = 800): string {
    if (!content) return "";

    const cleanContent = content.replace(/\s+/g, ' ');
    const sentences = cleanContent.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleanContent];

    const queryTerms = query.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !IGNORE_WORDS.has(w));

    const scoredSentences = sentences.map((sentence, index) => {
        const lower = sentence.toLowerCase();
        let score = 0;

        for (const term of queryTerms) {
            if (lower.includes(term)) score += 1;
        }

        if (index < 3) score += 0.5;

        return { sentence, score, index };
    });

    scoredSentences.sort((a, b) => b.score - a.score);

    const selected: { sentence: string; index: number }[] = [];
    let currentLength = 0;

    for (const item of scoredSentences) {
        if (currentLength + item.sentence.length > maxLength) break;
        selected.push(item);
        currentLength += item.sentence.length;
    }

    if (selected.length === 0) {
        return cleanContent.substring(0, maxLength) + "...";
    }

    selected.sort((a, b) => a.index - b.index);

    return selected.map(s => s.sentence.trim()).join(' ');
}

async function evaluateSearchSatisfiability(
    userQuestion: string,
    results: EnrichedSearchResult[],
    model: string
): Promise<{ sufficient: boolean; newQueries: string[] }> {
    if (results.length === 0) return { sufficient: false, newQueries: [userQuestion] };

    const highQualityCount = results.filter(r => (r.score || 0) > 15).length;
    if (highQualityCount >= 3) return { sufficient: true, newQueries: [] };

    console.log("[Search] Evaluating sufficiency of results...");

    try {
        const summaries = results.slice(0, 4).map(r => `- ${r.title} (${r.domain})`).join('\n');

        const prompt = `You are a senior engineer's research assistant. 
User Question: "${userQuestion}"
Current Results Summary:
${summaries}

Task: Identify missing technical details or mechanisms.
Question: "What specific sub-questions or missing mechanisms should be searched next?"

Output ONLY 2 specific, technical search queries (one per line) to find this missing info.`;

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: { temperature: 0.1, num_predict: 50 }
            }),
        });

        if (!response.ok) return { sufficient: true, newQueries: [] };

        const data = await response.json();
        const text = data.response?.trim() || "";

        if (text.includes("SUFFICIENT")) {
            console.log("[Search] Results deemed SUFFICIENT.");
            return { sufficient: true, newQueries: [] };
        }

        const newQueries = text
            .split('\n')
            .map((q: string) => q.replace(/^[-\d.]+\s*/, '').trim())
            .filter((q: string) => q.length > 5 && !q.includes("SUFFICIENT"));

        console.log(`[Search] GAP DETECTED. Refining with: ${JSON.stringify(newQueries)}`);
        return { sufficient: false, newQueries: newQueries.slice(0, 2) };

    } catch (e) {
        console.error("Eval error:", e);
        return { sufficient: true, newQueries: [] };
    }
}

// ============================================================================
// MAIN INTELLIGENT SEARCH FUNCTION
// ============================================================================

export async function intelligentSearch(
    userQuestion: string,
    model: string = "llama3.1:8b",
    maxResults: number = 5,
    fetchContent: boolean = true,
    searchMode: SearchMode = 'auto'
): Promise<SearchResponse> {
    const startTime = Date.now();

    // ========================================================================
    // RULE 3: GENERAL MODE FAST PATH (The 'Basic Search' Protocol)
    // Goal: Sub-2-second latency. No LLM calls, no scraping, snippets only.
    // ========================================================================
    if (searchMode === 'general') {
        console.log(`[Search] FAST PATH: General mode for "${userQuestion}"`);

        const config = MANUAL_CONFIGS['general'];
        const { timeRange } = isTimelyQuery(userQuestion);

        const rawResults = await executeSearch(userQuestion, config.engines, timeRange);

        let rankedResults = rankResultsGeneral(rawResults, userQuestion);

        const seenUrls = new Set();
        rankedResults = rankedResults.filter(r => {
            if (seenUrls.has(r.url)) return false;
            seenUrls.add(r.url);
            return true;
        });

        const topResults = rankedResults.slice(0, maxResults);

        let formattedContext = `Found ${topResults.length} results for general query:\n\n`;
        topResults.forEach((r, i) => {
            formattedContext += `SOURCE ${i + 1}:\nTitle: ${r.title}\nDomain: ${r.domain}\nURL: ${r.url}\nSnippet: ${r.content}\n\n`;
        });
        formattedContext += "\nINSTRUCTION: Provide a clear, concise answer based on the snippets above.";

        console.log(`[Search] FAST PATH completed in ${Date.now() - startTime}ms`);
        return { queries: [userQuestion], results: topResults, formattedContext };
    }

    // ========================================================================
    // STANDARD PATH: For 'auto', 'scientific', 'industrial', 'code' modes
    // ========================================================================

    const { isTimely, timeRange } = isTimelyQuery(userQuestion);

    // Pre-Search Classification
    let config: DynamicSearchConfig;
    let categoryLog = "auto";

    if (searchMode !== 'auto' && searchMode in MANUAL_CONFIGS) {
        // Manual Override - SKIP classifyQuery LLM call
        const manual = MANUAL_CONFIGS[searchMode as keyof typeof MANUAL_CONFIGS];
        config = { category: searchMode as SearchCategory, ...manual };
        categoryLog = `MANUAL:${searchMode}`;
    } else {
        // Auto Classification - uses LLM
        config = await classifyQuery(userQuestion, model);
        categoryLog = `AUTO:${config.category}`;
    }

    console.log(`[Search] Query: "${userQuestion}" | Strategy: ${categoryLog} | Timely: ${isTimely}`);

    const engines = config.engines;
    console.log(`[Search] Engines: ${engines}`);

    // Generate Initial Queries (uses LLM)
    let queries = await generateSearchQueries(userQuestion, model);

    if (isTimely) {
        const year = new Date().getFullYear();
        const hasYear = /\b202\d\b/.test(userQuestion);
        if (!hasYear) queries.push(`${userQuestion} ${year}`);
    }

    // --- ITERATIVE SEARCH LOOP ---
    // ALL modes get 2 iterations for full capability
    // The difference: Manual modes SKIP the LLM evaluation (which is the slow part)
    let allResults: SearchResult[] = [];
    const maxIterations = 2;

    for (let i = 0; i < maxIterations; i++) {
        if (queries.length === 0) break;

        console.log(`[Search] Iteration ${i + 1}: Executing queries...`, queries);
        const searchPromises = queries.map(q => executeSearch(q, engines, timeRange));
        const newResults = (await Promise.all(searchPromises)).flat();

        allResults = [...allResults, ...newResults];

        if (i === maxIterations - 1) break;

        // Only AUTO mode uses LLM-based evaluation for refinement
        if (searchMode === 'auto') {
            const currentRanked = rankResults(allResults, userQuestion, false);
            const evaluation = await evaluateSearchSatisfiability(userQuestion, currentRanked, model);

            if (evaluation.sufficient) {
                break;
            } else {
                queries = evaluation.newQueries;
            }
        } else {
            // Manual modes: Simple heuristic - if we have good results, stop
            const currentRanked = rankResults(allResults, userQuestion, false);
            const highQualityCount = currentRanked.filter(r => (r.score || 0) > 15).length;
            if (highQualityCount >= 3) {
                console.log(`[Search] Manual mode: Found ${highQualityCount} high-quality results, stopping.`);
                break;
            }
            // Otherwise, continue with broader query
            queries = [userQuestion + " detailed"];
        }
    }

    // Fallback
    if (allResults.length === 0) {
        console.warn('[Search] Zero results. Trying original directly.');
        const fallback = await executeSearch(userQuestion, engines, timeRange);
        allResults = fallback;
    }

    console.log(`[Search] Total raw results: ${allResults.length}`);

    // ========================================================================
    // RULE 1 & 2: STRICT MODE-BASED FILTERING
    // ========================================================================
    allResults = filterResultsByMode(allResults, searchMode);
    console.log(`[Search] After mode filter: ${allResults.length} results`);

    // Final Rank & Enrich
    let rankedResults = rankResults(allResults, userQuestion, false);

    // Deduplicate
    const seenUrls = new Set();
    rankedResults = rankedResults.filter(r => {
        if (seenUrls.has(r.url)) return false;
        seenUrls.add(r.url);
        return true;
    });

    // Strict pass if many results
    if (rankedResults.length > 10) {
        const strict = rankResults(allResults, userQuestion, true);
        if (strict.length >= 3) {
            rankedResults = strict;
            const seenStrict = new Set();
            rankedResults = rankedResults.filter(r => {
                if (seenStrict.has(r.url)) return false;
                seenStrict.add(r.url);
                return true;
            });
            console.log(`[Search] Strict pass: ${rankedResults.length} results.`);
        }
    }

    // Desperation Mode
    if (rankedResults.length === 0 && allResults.length > 0) {
        const unique = Array.from(new Set(allResults.map(r => r.url)))
            .map(url => allResults.find(r => r.url === url))
            .filter((r): r is SearchResult => !!r)
            .slice(0, 3)
            .map(r => ({
                ...r,
                domain: extractDomain(r.url),
                favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(r.url)}&sz=32`,
                score: 1
            }));
        rankedResults = unique;
    }

    const topResults = rankedResults.slice(0, maxResults);

    // Fetch Content (if enabled)
    if (fetchContent) {
        const enriched = await Promise.all(topResults.map(async r => {
            const full = await fetchPageContent(r.url);
            return { ...r, fullContent: full || undefined };
        }));
        topResults.splice(0, enriched.length, ...enriched);
    }

    // Final Re-Ranking with Category Config
    const finalResults = reRankWithFullContent(topResults, userQuestion, config);

    // ========================================================================
    // Context Formatting (Mode-Aware Categorization)
    // ========================================================================
    const papers = finalResults.filter(r => /arxiv|ieee|springer|sciencedirect|nature|mdpi|researchgate/i.test(r.domain));
    const codeResults = finalResults.filter(r => /github|stackoverflow|gitlab|huggingface/i.test(r.domain));
    const industry = finalResults.filter(r => /siemens|asml|rockwell|honeywell|iso|iatf|batteryuniversity|catl/i.test(r.domain));
    const generalResults = finalResults.filter(r => !papers.includes(r) && !codeResults.includes(r) && !industry.includes(r));

    let formattedContext = `Found ${finalResults.length} results (Mode: ${searchMode}):\n\n`;

    const formatResult = (r: EnrichedSearchResult) => {
        const globalIndex = finalResults.indexOf(r) + 1;
        let text = `SOURCE ${globalIndex}:\nTitle: ${r.title}\nDomain: ${r.domain}\nURL: ${r.url}\n`;
        if (r.fullContent) {
            text += `Content: ${extractRelevantContext(r.fullContent, userQuestion)}\n`;
        } else {
            text += `Snippet: ${r.content}\n`;
        }
        return text + "\n";
    };

    // Mode-specific formatting
    if (searchMode === 'scientific') {
        formattedContext += "=== ACADEMIC & RESEARCH ===\n";
        formattedContext += [...papers, ...generalResults].map(formatResult).join('');
        formattedContext += "\nINSTRUCTION: Focus on scientific methodology, experimental results, and theoretical foundations.";
    } else if (searchMode === 'industrial') {
        formattedContext += "=== INDUSTRIAL STANDARDS & SPECIFICATIONS ===\n";
        formattedContext += [...industry, ...papers, ...generalResults].map(formatResult).join('');
        formattedContext += "\nINSTRUCTION: Focus on compliance standards, specifications, and manufacturing constraints.";
    } else if (searchMode === 'code') {
        formattedContext += "=== IMPLEMENTATION & CODE ===\n";
        formattedContext += [...codeResults, ...generalResults].map(formatResult).join('');
        formattedContext += "\nINSTRUCTION: Focus on implementation details, code examples, and technical documentation.";
    } else {
        // Auto mode - full categorization
        if (papers.length > 0) {
            formattedContext += "=== ACADEMIC & THEORY (Papers) ===\n";
            formattedContext += papers.map(formatResult).join('');
        }
        if (codeResults.length > 0) {
            formattedContext += "=== IMPLEMENTATION (Code) ===\n";
            formattedContext += codeResults.map(formatResult).join('');
        }
        if (industry.length > 0) {
            formattedContext += "=== INDUSTRIAL STANDARDS ===\n";
            formattedContext += industry.map(formatResult).join('');
        }
        if (generalResults.length > 0) {
            formattedContext += "=== GENERAL CONTEXT ===\n";
            formattedContext += generalResults.map(formatResult).join('');
        }
        formattedContext += "\nINSTRUCTION: Explain using theory (papers), implementation (code), and industrial constraints.";
    }

    console.log(`[Search] Completed in ${Date.now() - startTime}ms`);
    return { queries: [userQuestion, ...queries], results: finalResults, formattedContext };
}
