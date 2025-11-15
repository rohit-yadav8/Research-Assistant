package com.research.assistant;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/research")
@CrossOrigin(origins = "*")
public class ResearchController {

    private final ResearchService researchService;

    public ResearchController(ResearchService researchService) {
        this.researchService = researchService;
    }

    // ---------------- Text processing ----------------
    @PostMapping("/process")
    public ResponseEntity<?> processResearch(@RequestBody ResearchRequest request) {
        if ((request.getContent() == null || request.getContent().isBlank())
                && !"originality".equalsIgnoreCase(request.getOperation())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Content is required for this operation."));
        }
        if (request.getOperation() == null || request.getOperation().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Operation is required."));
        }
        String result = researchService.processContent(request).toString();
        return ResponseEntity.ok(Map.of("result", result));
    }

    // ---------------- File upload ----------------
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "operation", required = false) String operation,
                                            @RequestParam(value = "summaryStyle", required = false) String summaryStyle,
                                            @RequestParam(value = "targetLanguage", required = false) String targetLanguage) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded."));
        }
        try {
            String extractedText = researchService.extractTextFromFile(file);
            ResearchRequest request = new ResearchRequest();
            request.setContent(extractedText);
            request.setOperation(operation != null ? operation : "abstract");
            request.setSummaryStyle(summaryStyle != null ? summaryStyle : "ai_summary");
            request.setTargetLanguage(targetLanguage != null ? targetLanguage : "en");

            String processedResult = researchService.processContent(request).toString();

            Map<String, String> response = new HashMap<>();
            response.put("extractedText", extractedText);
            response.put("result", processedResult);
            return ResponseEntity.ok(response);

        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("error", "Processing error: " + ex.getMessage()));
        }
    }
}
