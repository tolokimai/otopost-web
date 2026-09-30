# Carousel Outline Generator Prompt
Version: 1.0.0
Author: OtoPost AI Team
Model Target: gemini-1.5-flash / gemini-2.5-flash

## Instructions
Generate an educational or storytelling social media carousel presentation.
Structure:
- Slide 1: High-converting Hook slide (Headline, subtext, body).
- Slide 2 to N-1: Core insights, steps, or breakdown with clear actionable takeaways.
- Slide N: Strong Call-To-Action (CTA) encouraging saves, shares, or comments.

## Output Schema
```json
{
  "title": "Judul Carousel",
  "slides": [
    {
      "headline": "Headline Slide",
      "body": "Penjelasan inti 1-2 kalimat padat dan jelas",
      "subtext": "Kategori / Nomor"
    }
  ]
}
```
