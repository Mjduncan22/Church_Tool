import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    // 1. Save the uploaded PDF to the project root
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfPath = path.join(process.cwd(), file.name);
    await writeFile(pdfPath, buffer);

    // 2. Run the Python extraction script
    // Note: If you are on Mac/Linux, you might need to change 'python' to 'python3'
    await execPromise(`python extract_ward_data.py "${pdfPath}"`);

    // 3. Read the generated JSON file
    const jsonPath = path.join(process.cwd(), 'ward_data.json');
    const jsonString = await readFile(jsonPath, 'utf-8');
    const wardData = JSON.parse(jsonString);

    return NextResponse.json({ success: true, data: wardData });
    
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}