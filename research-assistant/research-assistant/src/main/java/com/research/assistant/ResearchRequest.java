package com.research.assistant;

import com.fasterxml.jackson.annotation.JsonAlias;

public class ResearchRequest {

    @JsonAlias({"content", "text"})
    private String content;

    @JsonAlias({"operation", "task"})
    private String operation;

    private String targetLanguage;
    private String summaryStyle;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public String getTargetLanguage() { return targetLanguage; }
    public void setTargetLanguage(String targetLanguage) { this.targetLanguage = targetLanguage; }

    public String getSummaryStyle() { return summaryStyle; }
    public void setSummaryStyle(String summaryStyle) { this.summaryStyle = summaryStyle; }
}
