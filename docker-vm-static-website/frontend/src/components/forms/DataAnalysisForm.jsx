import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../FileUpload';
import api from '../../api/axios';
import { Loader2, BarChart2 } from 'lucide-react';

const DataAnalysisForm = ({ selectedModel }) => {
    const formRef = useRef(null);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [textInput, setTextInput] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file && !textInput.trim()) {
            setError('Please upload a CSV/Excel file or enter raw data.');
            return;
        }

        setIsLoading(true);
        setError('');

        const formData = new FormData();
        if (file) formData.append('file', file);
        if (textInput) formData.append('textInput', textInput);
        formData.append('analysisType', formRef.current.analysisType.value);
        formData.append('focusColumns', formRef.current.focusColumns.value);
        formData.append('reportDepth', formRef.current.reportDepth.value);
        formData.append('outputTone', formRef.current.outputTone.value);
        formData.append('context', formRef.current.context.value);
        formData.append('additionalInstructions', formRef.current.additionalInstructions.value);
        formData.append('model', selectedModel);

        try {
            const response = await api.post('/user/generate/analysis', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                navigate(`/results/${response.data.contentId}`);
            }
        } catch (err) {
            console.error("Data Analysis failed", err);
            setError(err.response?.data?.error || 'Failed to analyze data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        if (formRef.current) formRef.current.reset();
        setFile(null);
        setTextInput('');
        setError('');
    };

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex gap-3 text-indigo-300 text-sm">
                <BarChart2 className="w-5 h-5 flex-shrink-0" />
                <p>Upload a structured data file (CSV or Excel) to get automated insights, trend analysis, and recommendations.</p>
            </div>

            <div className="space-y-4">
                <div className={textInput ? "opacity-50 pointer-events-none grayscale" : ""}>
                    <FileUpload
                        accept=".csv,.xlsx,.xls"
                        label="Upload Dataset"
                        onFileSelect={(selectedFile) => setFile(selectedFile)}
                        disabled={!!textInput}
                    />
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-950 text-slate-500">Or Paste Data Below</span>
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="text-input" className="block text-sm font-medium text-slate-300">
                    Paste CSV Data
                </label>
                <textarea
                    id="text-input"
                    name="textInput"
                    rows="6"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="e.g. Date, Sales, Region..."
                    className={`w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none transition-all resize-none font-mono text-xs ${file ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={!!file}
                ></textarea>
                {file && <p className="text-xs text-amber-500/80">Input disabled because a file is selected.</p>}
                {textInput && <p className="text-xs text-amber-500/80">File upload disabled because text is entered.</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="analysis-type" className="block text-sm font-medium text-slate-300">
                        Primary Analysis Type
                    </label>
                    <select
                        id="analysis-type"
                        name="analysisType"
                        defaultValue="comprehensive"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="comprehensive">Comprehensive Report</option>
                        <option value="trend-discovery">Trend Discovery</option>
                        <option value="anomaly-detection">Anomaly Detection</option>
                        <option value="correlation-analysis">Correlation Analysis</option>
                        <option value="predictive-insights">Predictive Insights</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="focus-columns" className="block text-sm font-medium text-slate-300">
                        Focus Columns (Optional)
                    </label>
                    <input
                        type="text"
                        id="focus-columns"
                        name="focusColumns"
                        placeholder="e.g. Sales, Date, Region"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="report-depth" className="block text-sm font-medium text-slate-300">
                        Report Depth
                    </label>
                    <select
                        id="report-depth"
                        name="reportDepth"
                        defaultValue="standard"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="summary">Executive Summary (Brief)</option>
                        <option value="standard">Standard Analysis (Balanced)</option>
                        <option value="deep">Deep Dive Technical (Detailed)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="output-tone" className="block text-sm font-medium text-slate-300">
                        Output Tone
                    </label>
                    <select
                        id="output-tone"
                        name="outputTone"
                        defaultValue="professional"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="professional">Professional / Business</option>
                        <option value="academic">Academic / Scientific</option>
                        <option value="creative">Creative / Storytelling</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="context" className="block text-sm font-medium text-slate-300">
                    Business Context / Hypothesis (Optional)
                </label>
                <textarea
                    id="context"
                    name="context"
                    rows="2"
                    placeholder="e.g., 'We suspect a drop in performance due to supply chain issues'..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none transition-all resize-none placeholder:text-slate-600"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="additional-instructions" className="block text-sm font-medium text-slate-300">
                    Additional Instructions (Optional)
                </label>
                <textarea
                    id="additional-instructions"
                    name="additionalInstructions"
                    rows="3"
                    placeholder="e.g., 'Compare results with previous year's average'..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none transition-all resize-none placeholder:text-slate-600"
                />
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 transition-all"
                    disabled={isLoading}
                >
                    Reset
                </button>
                <button
                    type="submit"
                    className="btn-primary flex items-center gap-2 min-w-[180px] justify-center"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing Data...
                        </>
                    ) : (
                        "Generate Report"
                    )}
                </button>
            </div>
        </form>
    );
};

export default DataAnalysisForm;
