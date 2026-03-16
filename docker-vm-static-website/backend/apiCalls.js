const { extractTextFromFile } = require('./utils/textExtractor');
const { parseDataFile } = require('./utils/dataParser');
const { queryOpenAI } = require('./services/openAIService');
const { queryModel } = require('./services/huggingFaceService');
const xlsx = require('xlsx');

function mapModelId(model, featureType) {
  if (!model) return 'gpt-4o-mini';

  // OpenAI exact matches
  if (model.startsWith('gpt') || model.startsWith('o1')) {
    return model;
  }

  // Hugging Face Mappings
  const modelMappings = {
    'llama-3.1': 'meta-llama/Meta-Llama-3-8B-Instruct',
    'qwen-7b': 'Qwen/Qwen2.5-7B-Instruct',
    'qwen-coder': 'Qwen/Qwen2.5-Coder-7B-Instruct',
    'llama-3.2-1b': 'meta-llama/Llama-3.2-1B-Instruct',
    'llama-3.2-3b': 'meta-llama/Llama-3.2-3B-Instruct',
    'mixtral': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    'gemma2': 'google/gemma-2-9b-it'
  };

  return modelMappings[model] || 'meta-llama/Meta-Llama-3-8B-Instruct';
}

function extractJSON(text) {
  if (!text) return [];
  if (typeof text !== 'string') return text;

  // Helper to fix literal control characters
  const sanitize = (str) => {
    return str.replace(/[\u0000-\u001F]+/g, (match) => {
      if (match.includes('\n') || match.includes('\r')) return ' ';
      if (match.includes('\t')) return ' ';
      return '';
    });
  };

  const tryParse = (candidate) => {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      try {
        return JSON.parse(sanitize(candidate));
      } catch (e2) {
        throw e;
      }
    }
  };

  // 1. Try specific markdown code block capture
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return tryParse(jsonMatch[1]);
    } catch (e) {
      console.warn("JSON Parse Warning (Code Block):", e.message);
    }
  }

  // 2. Heuristic extraction
  try {
    const firstOpenBrace = text.indexOf('{');
    const firstOpenBracket = text.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
      startIdx = firstOpenBrace;
      endIdx = text.lastIndexOf('}');
    } else if (firstOpenBracket !== -1) {
      startIdx = firstOpenBracket;
      endIdx = text.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const candidate = text.substring(startIdx, endIdx + 1);
      return tryParse(candidate);
    }
  } catch (e) {
    console.warn("JSON Parse Warning (Heuristic):", e.message);
  }

  // 3. Last fallback
  try {
    const cleaned = text
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    return tryParse(cleaned);
  } catch (e) {
    console.warn("JSON Parse Warning (Raw):", e.message);
    console.warn("Failed Text:", text.substring(0, 100) + "...");
    return text;
  }
}

async function executeAIQuery(modelId, messages) {
  // Route to OpenAI for GPT models
  if (modelId.startsWith('gpt') || modelId.startsWith('o1')) {
    return await queryOpenAI(modelId, messages);
  }
  // Otherwise HuggingFace
  else {
    return await queryModel(modelId, messages);
  }
}

async function generateMCQs(fileElement, textInput, questionCount, difficulty, topic, audience, tone, language, additionalInstructions, model, questionStyle, bloomLevel) {

  let text;
  if (textInput) {
    text = textInput;
  } else if (fileElement) {
    text = await extractTextFromFile(fileElement.path);
  } else {
    throw new Error("No input provided (file or text).");
  }

  const modelId = mapModelId(model, 'mcq');

  const messages = [
    {
      role: 'system',
      content: `You are an expert Educational Content Architect. Generate ${questionCount} high-fidelity MCQs.
Difficulty: ${difficulty}
Target Audience: ${audience}
Topic Focus: ${topic || 'General'}
Tone: ${tone}
Output Language: ${language}
Question Style: ${questionStyle || 'Conceptual'}
Bloom's Level: ${bloomLevel || 'Apply'}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}
Return ONLY a raw JSON array of objects. Schema: [{"question": "...", "options": ["...", "...", "...", "..."], "correct": "Option index (0-3)", "explanation": "..."}]`
    },
    { role: 'user', content: `TEXT TO ANALYZE: ${text.substring(0, 12000)}` }
  ];

  const response = await executeAIQuery(modelId, messages);
  return extractJSON(response);
}

async function generateSummary(fileElement, textInput, summaryLength, format, tone, focusKeywords, additionalInstructions, model, perspective) {

  let text;
  if (textInput) {
    text = textInput;
  } else if (fileElement) {
    text = await extractTextFromFile(fileElement.path);
  } else {
    throw new Error("No input provided (file or text).");
  }

  const modelId = mapModelId(model, 'summary');

  const messages = [
    {
      role: 'system',
      content: `You are a professional Executive Summarizer. 
Length: ${summaryLength}
Format: ${format}
Tone: ${tone}
Perspective: ${perspective || 'General Audience'}
${focusKeywords ? `Keywords to focus on: ${focusKeywords}` : ''}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}
Generate a clear, high-quality summary of the provided text.`
    },
    { role: 'user', content: `TEXT: ${text.substring(0, 15000)}` }
  ];

  const response = await executeAIQuery(modelId, messages);
  return response.trim();
}

async function generateQuiz(fileElement, textInput, quizType, questionCount, difficulty, audience, additionalInstructions, model, focusArea, questionStyle) {

  let text;
  if (textInput) {
    text = textInput;
  } else if (fileElement) {
    text = await extractTextFromFile(fileElement.path);
  } else {
    throw new Error("No input provided (file or text).");
  }

  const modelId = mapModelId(model, 'quiz');

  const messages = [
    {
      role: 'system',
      content: `You are an expert Quiz Architect. 
Type: ${quizType}
Number of Questions: ${questionCount}
Difficulty: ${difficulty}
Target Audience: ${audience}
Focus Area: ${focusArea || 'General Concepts'}
Question Style: ${questionStyle || 'Standard Academic'}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}
Generate a quiz based on the provided text. Return ONLY a raw JSON array of objects. 
Schema: {"question": "...", "options": ["Option A", "Option B", "Option C", "Option D"], "correct": "Letter", "explanation": "..."}`
    },
    { role: 'user', content: `TEXT: ${text.substring(0, 12000)}` }
  ];

  const response = await executeAIQuery(modelId, messages);
  return extractJSON(response);
}

async function explainCode(fileElement, pastedCode, options, model, analysisDepth, outputStyle) {
  const { language, additionalInstructions } = options;
  let codeContent = pastedCode;
  if (fileElement && !pastedCode) {
    codeContent = await extractTextFromFile(fileElement.path);
  } else if (!fileElement && !pastedCode) {
    throw new Error("No input provided (file or text).");
  }

  const modelId = mapModelId(model, 'code-tools');

  const messages = [
    {
      role: 'system',
      content: `You are a Senior Software Engineer. Explain this code clearly.
Programming Language: ${language}
Analysis Depth: ${analysisDepth || 'Standard Review'}
Output Style: ${outputStyle || 'Educational'}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}

Return ONLY a raw JSON object with this schema: 
{
  "summary": "Overall explanation string",
  "complexity": "Rating 1-10",
  "functions": [
    {
      "name": "Function/Block Name",
      "description": "What it does",
      "logic": "Step by step logic"
    }
  ],
  "key_learnings": ["Bullet point 1", "Bullet point 2"]
}`
    },
    { role: 'user', content: `CODE:\n${codeContent}` }
  ];

  const response = await executeAIQuery(modelId, messages);
  return extractJSON(response);
}

async function reviewCode(fileElement, pastedCode, options, model, analysisDepth, outputStyle) {
  const { operation, language, additionalInstructions } = options;
  let codeContent = pastedCode;
  if (fileElement && !pastedCode) {
    codeContent = await extractTextFromFile(fileElement.path);
  } else if (!fileElement && !pastedCode) {
    throw new Error("No input provided (file or text).");
  }

  const modelId = mapModelId(model, 'code-tools');

  const messages = [
    {
      role: 'system',
      content: `You are a Lead DevOps & Security Engineer. Operation: ${operation}.
Programming Language: ${language}
Analysis Depth: ${analysisDepth || 'Standard Review'}
Output Style: ${outputStyle || 'Technical'}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}

Return ONLY a raw JSON object with this schema:
{
  "review_summary": "High-level findings",
  "issues": [
    {
      "severity": "High | Medium | Low",
      "line": "Approx line number or 'Global'",
      "description": "Issue description",
      "recommendation": "How to fix it"
    }
  ],
  "improved_code": "The full rewritten/optimized code block string"
}`
    },
    { role: 'user', content: `CODE:\n${codeContent}` }
  ];

  const response = await executeAIQuery(modelId, messages);
  return extractJSON(response);
}

async function generateFlashcards(fileElement, textInput, difficulty, focusTopics, count, additionalInstructions, model, cardStyle, detailLevel) {

  let text;
  if (textInput) {
    text = textInput;
  } else if (fileElement) {
    text = await extractTextFromFile(fileElement.path);
  } else {
    throw new Error("No input provided (file or text).");
  }

  const modelId = mapModelId(model, 'flashcards');

  const messages = [
    {
      role: 'system',
      content: `Generate ${count} flashcards. 
Difficulty: ${difficulty}
Focus Topics: ${focusTopics || 'General'}
Front Card Style: ${cardStyle || 'Question'}
Answer Detail: ${detailLevel || 'Moderate'}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}
Return ONLY a JSON array: [{"question": "...", "answer": "..."}]`
    },
    { role: 'user', content: `TEXT: ${text.substring(0, 12000)}` }
  ];

  const response = await executeAIQuery(modelId, messages);
  return extractJSON(response);
}

async function analyzeData(fileElement, textInput, focusColumns, context, additionalInstructions, analysisType, model, reportDepth, outputTone) {

  let data;
  if (textInput) {
    // Parse Raw CSV Text
    try {
      const workbook = xlsx.read(textInput, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      if (!jsonData || jsonData.length === 0) throw new Error("Empty data");

      const headers = jsonData[0];
      const rows = jsonData.slice(1);

      // Intelligent Sampling Strategy
      let selectedRows = rows;
      if (rows.length > 50) {
        const start = rows.slice(0, 20);
        const middle = rows.slice(Math.floor(rows.length / 2) - 10, Math.floor(rows.length / 2) + 10);
        const end = rows.slice(rows.length - 20);
        selectedRows = [...start, ...middle, ...end];
      }

      const previewRows = selectedRows.map(row => {
        let obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      });

      data = {
        summary: { totalRows: rows.length, columns: headers, columnCount: headers.length, sampleSize: selectedRows.length },
        rawText: JSON.stringify(previewRows),
        preview: previewRows
      };
    } catch (e) {
      // If XLS parsing fails, fallback to simple CSV
      console.warn("Input parsing failed, using raw text context");
      data = {
        summary: { note: "Raw Text Input" },
        rawText: textInput.substring(0, 25000), // Increased text limit
        preview: []
      };
    }
  } else if (fileElement) {
    data = await parseDataFile(fileElement.path);
  } else {
    throw new Error("No input provided (file or text).");
  }

  const modelId = mapModelId(model, 'data-analysis');

  const messages = [
    {
      role: 'system', content: `You are a World-Class Senior Data Scientist (Ph.D. level). 
Your goal is to provide a "Consulting-Grade" comprehensive analysis report that is statistically rigorous yet business-actionable.

MANDATORY: You must return a valid JSON object. Do NOT skip any keys.
CRITICAL: Never include literal newlines or tabs inside JSON string values. Use escaped \\n for multi-line text. If a specific analysis (like trends) is not possible, provide a data-driven hypothesis or observation instead of leaving it empty.

ANALYSIS PARAMETERS:
Analysis Type: ${analysisType || 'Comprehensive Audit'}
Focus Columns: ${focusColumns || 'Auto-detect all critical features'}
Additional Instructions: ${additionalInstructions || 'None'}

REPORT REQUIREMENTS:
1. **Executive Summary**: A C-Level overview of the health, quality, and main story of the data.
2. **Deep Statistical Insights**: Beyond basic averages—look for skewness, variance, and interesting distributions.
3. **Multivariate Correlation Analysis**: How variables interact, confuse, or drive each other.
4. **Trend & Seasonality Decomposition**: If time-series data exists, analyze cyclic patterns, trends, and noise.
5. **Segment/Cluster Analysis**: Identify distinct groups or personas within the data.
6. **Detailed Anomaly Detection**: Identify specific outliers and explain WHY they are outliers.
7. **Predictive Modeling Feasibility**: Can we predict X from Y? Which models would work best (Random Forest, ARIMA, Neural Networks)?
8. **Executive Strategic Recommendations**: High-level business actions based on the math.

Return a JSON object with this EXACT schema (all text must be in rich markdown format):
{
  "executive_summary": "High-density overview summarizing the entire multi-faceted analysis.",
  "data_quality_audit": {
    "score": "Integer (0-100)",
    "details": "MANDATORY: Detailed paragraph on completeness and validity."
  },
  "key_features": ["List of 5-7 most critical drivers found in the data"],
  "statistical_insights": [
    "Insight 1 (e.g. Distribution analysis of key metrics)",
    "Insight 2 (e.g. Significant correlations detected)",
    "Insight 3 (e.g. Statistical significance of findings)"
  ],
  "market_trends": {
    "overview": "Explanation of general trend direction...",
    "details": ["Specific Trend 1", "Specific Trend 2", "Specific Trend 3"]
  },
  "segmentation_analysis": "MANDATORY: Detailed description of distinct clusters or personas found.",
  "anomalies": ["Specific Outlier 1 + Context", "Specific Outlier 2 + Context"],
  "predictive_potential": {
    "feasibility": "High/Medium/Low",
    "recommended_models": ["Model Label 1", "Model Label 2"],
    "details": "MANDATORY: Explanation of model fit."
  },
  "recommendations": ["Actionable Recommendation 1", "Actionable Recommendation 2", "Actionable Recommendation 3"],
  "visualizations": [
    {
      "type": "bar | line | area | pie",
      "title": "Impactful Title",
      "description": "1-sentence analytical takeaway.",
      "data": [{"name": "Label", "value": 100}],
      "themeColor": "indigo | teal | purple | emerald"
    }
  ]
}`
    },
    {
      role: 'user', content: `GENERATE COMPREHENSIVE REPORT.
      
BUSINESS CONTEXT: ${context || "General Exploratory Data Analysis"}
ANALYSIS DEPTH: ${reportDepth || 'Standard Balanced Analysis'}
OUTPUT TONE: ${outputTone || 'Professional Business'}
FULL DATA META-SUMMARY: ${JSON.stringify(data.summary)}
REPRESENTATIVE DATA SAMPLE (${data.summary.sampleSize || 'N/A'} rows): 
${data.rawText}`
    }
  ];

  const response = await executeAIQuery(modelId, messages, { max_tokens: 8000 });

  const cleanedResponse = extractJSON(response);

  return {
    analysis: cleanedResponse,
    meta: data.summary,
    preview: data.preview
  };
}

async function visualizeData(fileElement, textInput, focusColumns, analysisType, dashboardTheme, includeInsights, model) {

  let data;
  if (textInput) {
    try {
      const workbook = xlsx.read(textInput, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      if (!jsonData || jsonData.length === 0) throw new Error("Empty data");

      const headers = jsonData[0];
      const rows = jsonData.slice(1);

      // Intelligent Sampling
      let selectedRows = [];
      const totalRows = rows.length;
      if (totalRows <= 150) {
        selectedRows = rows;
      } else {
        const start = rows.slice(0, 50);
        const middleIdx = Math.floor(totalRows / 2);
        const middle = rows.slice(middleIdx - 25, middleIdx + 25);
        const end = rows.slice(totalRows - 50);
        selectedRows = [...start, ...middle, ...end];
      }

      const previewRows = selectedRows.map(row => {
        let obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });

      data = {
        summary: { totalRows: rows.length, columns: headers, columnCount: headers.length, sampleSize: selectedRows.length },
        rawText: JSON.stringify(previewRows),
        preview: previewRows
      };
    } catch (e) {
      console.error("Text parse error", e);
      throw new Error("Failed to parse text input. Ensure it is valid CSV/Excel format.");
    }
  } else if (fileElement) {
    data = await parseDataFile(fileElement.path);
  }

  const modelId = mapModelId(model, 'data-analysis');

  // Determine if this is a dedicated EDA request
  const isEDA = analysisType && (analysisType.toLowerCase().includes('eda') || analysisType.toLowerCase().includes('exploratory'));

  if (isEDA) {
    // HYBRID ARCHITECTURE: PYTHON COMPUTES, AI EXPLAINS
    const { spawn } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    // 1. Determine the data source for Python
    const tempFilePath = path.join(__dirname, 'temp_dataset.csv');
    let pythonDataSource = tempFilePath;
    let csvContent = textInput || data.rawText;

    if (fileElement && fileElement.path) {
      // If we have an actual file, use it directly (better for large datasets)
      pythonDataSource = fileElement.path;
    } else {
      // If we have text input or JSON, save it to a temporary CSV
      if (csvContent && csvContent.trim().startsWith('[')) {
        try {
          const jsonData = JSON.parse(csvContent);
          const headers = Object.keys(jsonData[0]);
          csvContent = headers.join(',') + '\n' + jsonData.map(row => headers.map(h => row[h]).join(',')).join('\n');
        } catch (e) {
          console.error("JSON parse failed, assuming raw CSV");
        }
      }
      fs.writeFileSync(tempFilePath, csvContent || '');
    }

    // 2. Execute Python EDA Engine
    const pythonScript = path.join(__dirname, 'python_services', 'eda_engine.py');

    const pythonProcess = spawn('python', [pythonScript, pythonDataSource]);

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    return new Promise((resolve, reject) => {
      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error(`Python script failed with code ${code}: ${pythonError}`);

          // Cleanup even on error
          try { fs.unlinkSync(tempFilePath); } catch (e) { }

          // Fallback to pure AI if Python fails
          // Original EDA prompt for AI fallback
          const systemPrompt = `You are an AI Data Scientist performing COMPLETE Exploratory Data Analysis.

MISSION: Analyze the dataset like a professional would in Jupyter Notebook, but output DASHBOARD-READY JSON (not code/markdown).

CRITICAL RULES:
✅ Return ONE valid JSON object matching the schema exactly
✅ All statistics MUST be from actual data (no fabrication)
✅ All charts MUST use real data (no placeholders)
✅ Explanations MUST be user-friendly (no jargon/code)
✅ Use escaped \\\\\\\\\\\\\\\\n for multi-line text
❌ NO markdown, NO code, NO methodology explanations
❌ NO correlations without ≥2 numerical columns
❌ NO trends without time/date columns
❌ NO segmentation without categorical columns

EDA PIPELINE (Execute Systematically):

1. DATA OVERVIEW: Count rows/columns, identify types (numerical/categorical/datetime), calculate cardinality
2. DATA QUALITY: Missing values %, duplicates, outliers (IQR method), quality score (0-100)
3. UNIVARIATE ANALYSIS:
   - Numerical: mean, median, std, Q1, Q3, skewness → Generate histograms & box plots
   - Categorical: frequency distribution → Generate bar/pie charts (pie only if ≤10 categories)
4. BIVARIATE ANALYSIS: Pearson correlations, identify |r|>0.7 → Generate scatter plots for top 3
5. MULTIVARIATE: Feature interactions if ≥3 numerical columns
6. OUTLIERS: IQR method (Q1-1.5×IQR, Q3+1.5×IQR) and Z-score (|z|>3)
7. INSIGHTS: Summarize distributions, relationships, quality issues
8. RECOMMENDATIONS: Data cleaning, feature engineering, encoding needs, modeling readiness

VISUALIZATION REQUIREMENTS (6-10 charts):
- 2-3 Histograms (numerical distributions)
- 1-2 Box plots (outliers)
- 2-3 Scatter plots (correlations)
- 1-2 Bar charts (categorical frequencies)
- 1 Pie chart (if applicable)

EXPLANATION STYLE:
❌ "Pearson r=-0.73 indicates strong negative linear association"
✅ "As A increases, B decreases (strong relationship)"
❌ "Distribution exhibits positive skewness (γ=1.2)"
✅ "Most values cluster left with a long tail of higher values"

OUTPUT JSON SCHEMA:
{
  "dashboard_title": "Exploratory Data Analysis: [Dataset Name]",
  "executive_summary": "2-4 sentences: dataset size, key patterns, data health, main findings",
  "data_quality_audit": {
    "score": 0-100,
    "details": "X% missing, Y duplicates, Z outliers in columns A,B"
  },
  "market_trends": {
    "overview": "Main distribution patterns and relationships",
    "details": ["Insight 1", "Insight 2", "Insight 3"]
  },
  "segmentation_analysis": "Categorical grouping insights or null",
  "anomalies": ["Outlier in [Col]: value [X] is [Y] std devs from mean", "..."],
  "recommendations": ["Handle missing data in [Col]", "Transform skewed [Col]", "Encode [Col]"],
  "statistical_insights": ["[Col] mean=[X] std=[Y]", "[Col] shows [skew type]", "Correlation [A]-[B]: [r]"],
  "kpis": [
    {"label": "Total Rows", "value": "formatted", "change": "N/A", "trend": "neutral", "icon": "activity"},
    {"label": "Quality Score", "value": "X/100", "change": "N/A", "trend": "neutral", "icon": "trending-up"}
  ],
  "visualizations": [
    {
      "id": "unique_id",
      "type": "bar|line|area|pie|scatter|box|histogram|treemap",
      "title": "Distribution of [Column]",
      "description": "Mean=X, Median=Y, Skew=Z. Interpretation.",
      "layout": "half|full",
      "data": [{"name": "bin/category", "value": number, "secondary": number|null}],
      "colors": ["#6366f1", "#14b8a6"]
    }
  ]
}

CHECKLIST:
□ Statistics from actual data
□ Charts use real data
□ Quality score is evidence-based
□ Outliers identified (IQR/Z-score)
□ Correlations only if ≥2 numerical columns
□ Explanations user-friendly
□ Recommendations actionable
□ Valid JSON

NOW EXECUTE THE FULL EDA AND RETURN JSON.`;

          const messages = [
            { role: 'system', content: systemPrompt },
            {
              role: 'user', content: `DATA META: ${JSON.stringify(data.summary)}
SAMPLE DATA: ${data.rawText}
FOCUS COLUMNS: ${focusColumns || 'Auto-detect'}
THEME: ${dashboardTheme}
INCLUDE INSIGHTS: ${includeInsights}`
            }
          ];

          const fallbackReport = await executeAIQuery(modelId, messages, { max_tokens: 8000 }).then(extractJSON);
          resolve({
            visualizations: fallbackReport,
            meta: data.summary,
            preview: data.preview
          });
          return;
        }

        try {
          const edaStats = JSON.parse(pythonOutput);

          // 3. AI Insight Generation - ONLY for text interpretations
          // We only send a summary description to the AI to save tokens and prevent confusion
          const statsForAI = {
            dataset_overview: edaStats.dataset_overview,
            data_quality_audit: edaStats.data_quality_audit,
            statistical_insights: edaStats.statistical_insights,
            market_trends_samples: edaStats.market_trends.details,
            anomaly_summary: edaStats.anomalies
          };

          const insightPrompt = `
                    You are a Senior Data Scientist.
                    
                    TASKS:
                    1. Create a "dynamic_title" that reflects the actual SUBJECT of the data (e.g., "Student Performance Study" or "Retail Sales Analysis"). DO NOT USE FILENAMES.
                    2. Write a detailed "executive_summary" (4-5 sentences) summarizing the data's health, main trends, and key findings.
                    3. provide exhaustive descriptions for each chart.

                    DATA FOR CONTEXT: ${JSON.stringify(statsForAI).substring(0, 10000)}

                    Return ONLY JSON:
                    {
                      "dynamic_title": "Subject-based Title",
                      "executive_summary": "In-depth overview of findings...",
                      "recommendations": ["Action 1", "Action 2", "Action 3"],
                      "segmentation_analysis": "Context for the groups found.",
                      "market_trends_overview": "Summary of identified patterns."
                    }
                    `;

          const aiResponse = await executeAIQuery(modelId, [{ role: 'system', content: insightPrompt }], { max_tokens: 2500 });
          const insights = extractJSON(aiResponse);

          // 4. Merge AI insights back into the Python structure
          // This ensures the charts (visualizations) remain untouched and accurate
          const finalReport = {
            ...edaStats,
            dashboard_title: insights.dynamic_title || edaStats.dashboard_title,
            executive_summary: insights.executive_summary || edaStats.executive_summary,
            recommendations: (insights.recommendations && insights.recommendations.length > 0) ? insights.recommendations : edaStats.recommendations,
            segmentation_analysis: insights.segmentation_analysis || "General patterns observed across the dataset.",
            market_trends: {
              ...edaStats.market_trends,
              overview: insights.market_trends_overview || edaStats.market_trends.overview
            }
          };

          resolve({
            visualizations: finalReport,
            meta: data.summary,
            preview: data.preview
          });

          // Cleanup
          if (fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) { }
          }

        } catch (parseError) {
          console.error("Failed to parse Python output or AI insights", parseError);
          // Final fallback: Return the raw stats from Python if AI merging fails
          try {
            const rawStats = JSON.parse(pythonOutput);
            resolve({
              visualizations: rawStats,
              meta: data.summary,
              preview: data.preview
            });
          } catch (e) {
            reject(parseError);
          }
        }
      });
    });

  } else {
    // GENERIC VISUALIZATION PROMPT (for non-EDA analysis types)
    const systemPrompt = `You are a World-Class Data Scientist & Visualization Architect.
Your goal is to perform a ${analysisType || 'Comprehensive'} Analysis on the provided dataset and generate a professional report with interactive visualizations.

MANDATORY: Return a valid JSON object. Include ALL keys.
CRITICAL: Never include literal newlines or tabs inside JSON string values. Use escaped \\\\n for multi-line text.

Analysis Goals based on Type:
- **Market Analysis & Trends**: Focus on time-series trends (Line/Area), growth rates, and forecasting.
- **Customer Segmentation**: Focus on clusters, demographic breakdowns (Pie/Donut), and behavioral patterns.
- **Operational Performance**: Focus on efficiency metrics (Bar/Funnel), KPIs, and process bottlenecks.
- **Financial Forecasting**: Focus on predictive metrics, revenue projections, and financial KPIs.
- **Comprehensive**: A balanced mix of all the above, ensuring a complete 360-degree view.

Return a JSON object with this EXACT schema:
{
  "dashboard_title": "Professional Report Title",
  "executive_summary": "High-level managerial summary of the findings (3-4 sentences).",
  "data_quality_audit": {
      "score": 95,
      "details": "Assessment of missing values, outliers, and data consistency."
  },
  "market_trends": {
      "overview": "Summary of identified trends or distributions.",
      "details": ["Insight 1...", "Insight 2..."]
  },
  "segmentation_analysis": "Detailed text about user/product segments (Optional, use if relevant).",
  "anomalies": ["Anomaly 1...", "Anomaly 2..."],
  "recommendations": ["Actionable recommendation 1...", "Actionable recommendation 2..."],
  "statistical_insights": ["Stat 1 (e.g. Mean/Median)", "Stat 2 (e.g. Std Dev)", "Stat 3 (Correlation)"],
  "kpis": [
    {
      "label": "Metric Name",
      "value": "Formatted Value",
      "change": "Percentage Change",
      "trend": "up | down | neutral",
      "icon": "dollar | users | activity | trending-up | box | calendar"
    }
  ],
  "visualizations": [
    {
      "id": "unique_id_1",
      "type": "area | bar | line | composed | pie | radar | scatter | funnel | treemap",
      "title": "Chart Title",
      "description": "Specific insight derived from this chart.",
      "layout": "full | half",
      "data": [
        {"name": "Label", "value": 123, "secondary": 456}
      ],
      "colors": ["#8884d8", "#82ca9d", "#ffc658"]
    }
  ]
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user', content: `DATA META: ${JSON.stringify(data.summary)}
SAMPLE DATA: ${data.rawText}
FOCUS COLUMNS: ${focusColumns || 'Auto-detect'}
THEME: ${dashboardTheme}
INCLUDE INSIGHTS: ${includeInsights}`
      }
    ];

    const response = await executeAIQuery(modelId, messages, { max_tokens: 8000 });
    const cleanedResponse = extractJSON(response);

    return {
      visualizations: cleanedResponse, // Keeps same key for frontend compatibility, but now contains full report
      meta: data.summary,
      preview: data.preview
    };
  }
}

module.exports = {
  generateMCQs,
  generateSummary,
  generateQuiz,
  explainCode,
  reviewCode,
  generateFlashcards,
  analyzeData,
  visualizeData
};
