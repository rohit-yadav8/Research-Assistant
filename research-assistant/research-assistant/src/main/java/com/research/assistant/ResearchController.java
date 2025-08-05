package com.research.assistant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/research")
public class ResearchController {

    private final ResearchService researchService;

    @Autowired
    public ResearchController(ResearchService researchService) {
        this.researchService = researchService;
    }

    @PostMapping("/process")
    public String processResearch(@RequestBody ResearchRequest request) {
        return researchService.processContent(request);
    }
}
