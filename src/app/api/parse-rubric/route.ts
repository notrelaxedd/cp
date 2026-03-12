import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseFile } from "@/lib/parse-file";
import { generateText } from "@/lib/gemini";

export const maxDuration = 60;

const RUBRIC_PROMPT = `You are an expert at parsing grading rubrics. Given the raw text extracted from a rubric document, parse it into a structured JSON format.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "name": "Name of the rubric",
  "description": "Brief description of what this rubric evaluates",
  "max_score": <total maximum score as a number>,
  "criteria": [
    {
      "name": "Criterion name",
      "description": "What this criterion evaluates",
      "max_score": <maximum points for this criterion as a number>
    }
  ]
}

Rules:
- Extract every grading criterion you can find
- If scores aren't explicitly stated, infer reasonable point values that sum to max_score
- If no total score is given, default max_score to 100 and distribute proportionally
- Keep descriptions concise but informative
- Return valid JSON only`;

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // 1. Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get uploaded file from form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are accepted" },
        { status: 400 }
      );
    }

    // 3. Store file in Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("rubrics")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 4. Extract text
    const extractedText = await parseFile(fileBuffer, file.type);

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from the file" },
        { status: 422 }
      );
    }

    // 5. Send to Gemini for parsing
    const responseText = await generateText(
      `${RUBRIC_PROMPT}\n\nHere is the rubric text:\n\n${extractedText}`
    );

    let parsed: {
      name: string;
      description: string;
      max_score: number;
      criteria: { name: string; description: string; max_score: number }[];
    };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response into valid rubric JSON" },
        { status: 502 }
      );
    }

    // 6. Save to rubrics table
    const { data: rubric, error: insertError } = await supabase
      .from("rubrics")
      .insert({
        user_id: user.id,
        name: parsed.name,
        description: parsed.description || null,
        criteria: parsed.criteria,
        max_score: parsed.max_score,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save rubric: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ rubric });
  } catch (err) {
    console.error("parse-rubric error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
