"""Prompt templates for JD analysis and ATS scoring."""

ANALYZE_JD_PROMPT = """You are an expert ATS (Applicant Tracking System) analyzer and career coach.

Analyze the following job description against the candidate's resume and provide a comprehensive ATS compatibility report.

Job Description:
{job_description}

Candidate Resume (JSON):
{resume_data}

IMPORTANT: Generate ALL text content in {output_language}.

Provide your analysis as a JSON object with this EXACT structure:
{{
  "ats_score": <integer 0-100>,
  "score_breakdown": {{
    "keyword_match": <integer 0-100>,
    "skills_alignment": <integer 0-100>,
    "experience_relevance": <integer 0-100>,
    "education_fit": <integer 0-100>,
    "formatting_score": <integer 0-100>
  }},
  "matching_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "matching_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "experience_gap": {{
    "required_years": <integer or null>,
    "candidate_years": <integer or null>,
    "meets_requirement": <boolean>,
    "assessment": "brief assessment text"
  }},
  "priority_changes": [
    {{
      "priority": "high" | "medium" | "low",
      "section": "summary" | "experience" | "skills" | "education" | "projects" | "certifications",
      "current_text": "what the resume currently says or lacks",
      "suggested_change": "specific actionable improvement",
      "reason": "why this change matters for ATS"
    }}
  ],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "job_title": "extracted job title",
  "company_name": "extracted company name or empty string",
  "seniority_level": "junior" | "mid" | "senior" | "lead" | "manager" | "director" | "unknown",
  "overall_assessment": "2-3 sentence summary of how well the resume matches and what to do"
}}

Rules:
1. Be honest and precise with the ATS score - don't inflate it
2. The keyword_match score should reflect how many JD keywords appear verbatim in the resume
3. List ONLY skills explicitly mentioned in the JD for missing_skills
4. Priority changes should be specific and actionable, not generic advice
5. Limit priority_changes to the top 6 most impactful changes
6. Order priority_changes by impact (high priority first)
7. Do NOT suggest fabricating experience or skills the candidate doesn't have
8. For missing_skills, only include skills that could reasonably be added (e.g., the candidate has related experience)
9. The overall_assessment should be constructive and encouraging

Output ONLY the JSON object, no other text."""
