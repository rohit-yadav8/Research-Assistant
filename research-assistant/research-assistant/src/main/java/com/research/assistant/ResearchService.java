package com.research.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class ResearchService {

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResearchService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    // ---------------- Extract text from uploaded file ----------------
    public String extractTextFromFile(MultipartFile file) {
        String fileName = file.getOriginalFilename().toLowerCase();
        try (InputStream is = file.getInputStream()) {
            if (fileName.endsWith(".txt")) {
                return new String(file.getBytes());
            } else if (fileName.endsWith(".pdf")) {
                try (PDDocument doc = PDDocument.load(is)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    return stripper.getText(doc);
                }
            } else if (fileName.endsWith(".docx")) {
                try (XWPFDocument docx = new XWPFDocument(is)) {
                    StringBuilder sb = new StringBuilder();
                    for (XWPFParagraph p : docx.getParagraphs()) {
                        sb.append(p.getText()).append("\n");
                    }
                    return sb.toString();
                }
            } else {
                return null;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    // ---------------- Main content processing ----------------
    public String processContent(ResearchRequest request) {
        String op = request.getOperation();
        String content = request.getContent();
        String targetLang = request.getTargetLanguage() != null ? request.getTargetLanguage() : "en";

        if (op == null) {
            return "No operation specified.";
        }

        try {
            String result;

            switch (op.toLowerCase()) {
                case "summarize":
                    result = callAi(buildPrompt(request, "Write a concise summary:"));
                    break;
                case "bullet_summary":
                    result = callAi(buildPrompt(request, "Summarize the following text into bullet points:"));
                    break;
                case "detailed_summary":
                    result = callAi(buildPrompt(request, "Write a detailed, structured summary of the text:"));
                    break;
                case "abstract":
                    result = callAi(buildPrompt(request, "Write a research-paper style abstract for the text:"));
                    break;
                case "paraphrase":
                    result = callAi(buildPrompt(request, "Paraphrase the following text:"));
                    break;
                case "keypoints":
                    result = callAi(buildPrompt(request, "List the key points of the following text:"));
                    break;
                case "sentiment":
                    result = callAi(buildPrompt(request, "Analyze the sentiment (positive, negative, or neutral) of this text and explain briefly:"));
                    break;
                case "keywords":
                    result = callAi(buildPrompt(request, "Extract the top 10 most relevant keywords from the following text:"));
                    break;
                case "topics":
                    result = callAi(buildPrompt(request, "Suggest a few potential research or discussion topics related to the following text:"));
                    break;
                case "originality":
                    result = callAi(buildPrompt(request, "Estimate the originality or uniqueness of the following text (percentage and explanation):"));
                    break;
                case "translate":
                    result = translateText(content, targetLang);
                    break;
                case "meaning":
                    result = getMeaning(content, targetLang);
                    break;
                case "multilang_summary":
                    ResearchRequest summaryReq = new ResearchRequest();
                    summaryReq.setOperation("summarize");
                    summaryReq.setContent(content);
                    result = processContent(summaryReq);
                    if (!"en".equalsIgnoreCase(targetLang)) {
                        result = translateText(result, targetLang);
                    }
                    break;
                default:
                    result = callAi(buildPrompt(request, "Process the following text as per context:"));
            }

            // Translate final result if required
            if (!"en".equalsIgnoreCase(targetLang)
                    && !op.equalsIgnoreCase("translate")
                    && !op.equalsIgnoreCase("meaning")) {
                result = translateText(result, targetLang);
            }

            return result;

        } catch (Exception e) {
            return "Error processing request: " + e.getMessage();
        }
    }

    // ---------------- Translate ----------------
    private String translateText(String text, String targetLang) {
        String prompt = "Translate the following text into " + codeToAiName(targetLang)
                + ". Output only the translated text:\n\n" + text;
        return callAi(prompt);
    }

    // ---------------- Meaning ----------------
    private String getMeaning(String text, String targetLang) {
        String prompt = "Provide the meaning of the following word or phrase in " +
                codeToAiName(targetLang) + ". Output only the meaning:\n\n" + text;
        return callAi(prompt);
    }

    // ---------------- AI call with retry ----------------
    private String callAi(String prompt) {
        int maxRetries = 3;
        int delayMs = 2000; // 2 seconds

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Map<String, Object> requestBody = Map.of(
                        "contents", new Object[]{
                                Map.of("parts", new Object[]{
                                        Map.of("text", prompt)
                                })
                        }
                );

                String response = webClient.post()
                        .uri(geminiApiUrl + "?key=" + geminiApiKey)
                        .bodyValue(requestBody)
                        .retrieve()
                        .onStatus(status -> status.value() == 429,
                                clientResponse -> Mono.error(new RuntimeException("429 Too Many Requests")))
                        .bodyToMono(String.class)
                        .block();

                return extractTextFromResponse(response);

            } catch (Exception ex) {
                if (ex.getMessage().contains("429")) {
                    System.err.println("⚠️ Gemini API rate limit hit (429). Retrying...");
                    try {
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ignored) {
                    }
                    delayMs *= 2;
                } else {
                    return "Error calling AI API: " + ex.getMessage();
                }
            }
        }

        return "Error: Gemini API rate limit exceeded. Please wait and try again.";
    }

    // ---------------- Extract AI response ----------------
    private String extractTextFromResponse(String response) {
        try {
            GeminiResponse geminiResponse = objectMapper.readValue(response, GeminiResponse.class);
            if (geminiResponse.getCandidates() != null && !geminiResponse.getCandidates().isEmpty()) {
                GeminiResponse.Candidate candidate = geminiResponse.getCandidates().get(0);
                if (candidate.getContent() != null && candidate.getContent().getParts() != null
                        && !candidate.getContent().getParts().isEmpty()) {
                    return candidate.getContent().getParts().get(0).getText();
                }
            }
            return "No valid response from AI.";
        } catch (Exception e) {
            return "Error parsing AI response: " + e.getMessage();
        }
    }

    // ---------------- Build AI prompt ----------------
    private String buildPrompt(ResearchRequest request, String taskInstruction) {
        return taskInstruction + "\n\n" + request.getContent();
    }

    // ---------------- Language Code Mapping ----------------
    private String codeToAiName(String code) {
        switch (code.toLowerCase()) {
            case "en": return "English";
            case "hi": return "Hindi";
            case "fr": return "French";
            case "es": return "Spanish";
            case "de": return "German";
            case "zh": return "Chinese (Simplified)";
            default: return "English";
        }
    }
}
