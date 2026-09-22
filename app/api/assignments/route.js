import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const GROUP_NAMES = [
  'Elder Quorum 1',
  'Elder Quorum 2',
  'Relief Society 1',
  'Relief Society 2',
];

function normalizeGroupName(value) {
  const normalized = value.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
  if (normalized.includes('elder') && normalized.includes('1')) return 'Elder Quorum 1';
  if (normalized.includes('elder') && normalized.includes('2')) return 'Elder Quorum 2';
  if (normalized.includes('relief') && normalized.includes('1')) return 'Relief Society 1';
  if (normalized.includes('relief') && normalized.includes('2')) return 'Relief Society 2';
  return null;
}

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'Apartment_Assignments.csv');
    const csv = await readFile(csvPath, 'utf-8');
    const rows = csv.split(/\r?\n/).filter((row) => row.trim());
    const headers = rows.shift().split(',');
    const assignments = Object.fromEntries(GROUP_NAMES.map((group) => [group, []]));

    rows.forEach((row) => {
      row.split(',').forEach((apartment, index) => {
        const group = normalizeGroupName(headers[index] || '');
        const apartmentNumber = apartment.trim();
        if (group && apartmentNumber) assignments[group].push(apartmentNumber);
      });
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Assignment loading error:', error);
    return NextResponse.json({ error: 'Could not load apartment assignments.' }, { status: 500 });
  }
}
