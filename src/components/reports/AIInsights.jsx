import React from "react";
import { 
  IconSparkles, IconTrendingUp, IconAlertTriangle, 
  IconLightbulb, IconTarget, IconRefreshCw 
} from "../icons";

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  low: "bg-green-100 text-green-800 border-green-200"
};

const Button = ({ children, onClick, className = "" }) => (
  <button 
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none px-4 py-2 ${className}`}
  >
    {children}
  </button>
);

const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

export default function AIInsights({ insights, isGenerating, onGenerate }) {
  if (!insights && !isGenerating) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 shadow-xl rounded-xl p-8 text-center">
        <IconSparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Get AI-Powered Business Insights</h3>
        <p className="text-gray-600 mb-6 max-w-lg mx-auto">
          Let our AI analyze your laundry business data and provide personalized recommendations 
          to help you grow your business and improve operations.
        </p>
        <Button
          onClick={onGenerate}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg"
        >
          <IconSparkles className="w-5 h-5 mr-2" />
          Generate AI Insights
        </Button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 shadow-xl rounded-xl p-8 text-center">
        <IconRefreshCw className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-spin" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Your Business Data...</h3>
        <p className="text-gray-600">
          Our AI is studying your orders, revenue patterns, and customer behavior to generate 
          personalized insights and recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 shadow-xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-purple-100">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <IconSparkles className="w-6 h-6 text-purple-600" />
          AI Business Insights
        </h3>
        <p className="text-gray-600 mt-1">
          AI-powered analysis of your laundry business performance
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Overall Performance */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-white/50">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <IconTrendingUp className="w-5 h-5 text-green-600" />
            Overall Performance
          </h3>
          <p className="text-gray-700 leading-relaxed font-medium">{insights.overall_performance}</p>
        </div>

        {/* Key Insights */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-white/50">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <IconLightbulb className="w-5 h-5 text-blue-600" />
            Key Insights
          </h3>
          <div className="space-y-3">
            {insights.key_insights?.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                </div>
                <p className="text-gray-700 text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-white/50">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <IconTarget className="w-5 h-5 text-green-600" />
            Recommendations
          </h3>
          <div className="space-y-4">
            {insights.recommendations?.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
                  <Badge className={priorityColors[rec.priority]}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-gray-600 text-xs">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Concerns */}
        {insights.concerns && insights.concerns.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md border border-white/50">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
              <IconAlertTriangle className="w-5 h-5 text-red-600" />
              Areas of Concern
            </h3>
            <div className="space-y-3">
              {insights.concerns.map((concern, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
                  <IconAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">{concern}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-4 border-t border-purple-100">
          <Button 
            onClick={onGenerate} 
            className="bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 shadow-sm"
          >
            <IconRefreshCw className="w-4 h-4 mr-2" />
            Refresh Insights
          </Button>
        </div>
      </div>
    </div>
  );
}