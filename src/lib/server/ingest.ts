import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Department, ProcessingQueueItem, SourceType } from '@/lib/types';

const INGEST_STORAGE_ROOT = path.join(process.cwd(), 'storage', 'ingest');

const FACILITY_ID_HEADERS = ['facility_id', 'site_id', 'department_id'];
const FACILITY_CODE_HEADERS = ['facility_code', 'site_code', 'department_code'];
const FACILITY_NAME_HEADERS = ['facility', 'site', 'department', 'facility_name', 'site_name'];
const NOTE_HEADERS = ['notes', 'description'];
const SOURCE_DOCUMENT_HEADERS = ['source_document', 'document_name', 'document'];

export type ParsedCsvRow = {
  lineNumber: number;
  values: Record<string, string>;
};

export function sanitizeIngestFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^\w.\- ]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'upload';
}

export function normalizeCsvHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function parseCsvMatrix(documentText: string) {
  const text = documentText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += character;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim().length > 0));
}

export function parseCsvDocument(documentText: string) {
  const matrix = parseCsvMatrix(documentText);

  if (matrix.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const rawHeaders = matrix[0].map(normalizeCsvHeader);
  const duplicateHeaders = rawHeaders.filter(
    (header, index) => header && rawHeaders.indexOf(header) !== index
  );

  if (duplicateHeaders.length > 0) {
    throw new Error(`CSV file contains duplicate headers: ${Array.from(new Set(duplicateHeaders)).join(', ')}`);
  }

  const rows: ParsedCsvRow[] = matrix.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};

    rawHeaders.forEach((header, headerIndex) => {
      if (!header) return;
      values[header] = (cells[headerIndex] ?? '').trim();
    });

    return {
      lineNumber: index + 2,
      values,
    };
  });

  return {
    headers: rawHeaders,
    rows,
  };
}

function lookupValue(values: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = values[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function normalizeLookupToken(value: string) {
  return value.trim().toLowerCase();
}

export function resolveDepartmentForCsvRow(input: {
  values: Record<string, string>;
  departments: Pick<Department, 'id' | 'code' | 'name'>[];
  fallbackDepartmentId?: string | null;
}) {
  const byId = new Map(input.departments.map((department) => [department.id, department]));
  const byCode = new Map(
    input.departments.map((department) => [normalizeLookupToken(department.code), department])
  );
  const byName = new Map(
    input.departments.map((department) => [normalizeLookupToken(department.name), department])
  );

  const facilityId = lookupValue(input.values, FACILITY_ID_HEADERS);
  const facilityCode = lookupValue(input.values, FACILITY_CODE_HEADERS);
  const facilityName = lookupValue(input.values, FACILITY_NAME_HEADERS);
  const hasExplicitFacilityLookup = Boolean(facilityId || facilityCode || facilityName);

  if (facilityId) {
    const department = byId.get(facilityId);
    if (department) {
      return department;
    }
  }

  if (facilityCode) {
    const department = byCode.get(normalizeLookupToken(facilityCode));
    if (department) {
      return department;
    }
  }

  if (facilityName) {
    const department = byName.get(normalizeLookupToken(facilityName));
    if (department) {
      return department;
    }
  }

  if (hasExplicitFacilityLookup) {
    return null;
  }

  if (input.fallbackDepartmentId) {
    return byId.get(input.fallbackDepartmentId) ?? null;
  }

  return null;
}

export function getCsvRowNotes(values: Record<string, string>) {
  return lookupValue(values, NOTE_HEADERS);
}

export function getCsvRowSourceDocument(values: Record<string, string>, fallbackFileName: string) {
  return lookupValue(values, SOURCE_DOCUMENT_HEADERS) || fallbackFileName;
}

export function isSupportedSourceType(value: string): value is SourceType {
  return ['electricity', 'travel', 'shipping', 'gas', 'waste', 'water', 'other'].includes(value);
}

export async function persistIngestFile(input: {
  file: File;
  companyId: string;
  jobId: string;
  prefix: 'evidence' | 'csv';
}) {
  const safeFileName = sanitizeIngestFileName(input.file.name);
  const extension = path.extname(safeFileName);
  const storedFileName = `${input.prefix}-${input.jobId}-${randomUUID()}${extension}`;
  const directory = path.join(INGEST_STORAGE_ROOT, input.companyId);
  const storagePath = path.join(directory, storedFileName);

  await mkdir(directory, { recursive: true });
  await writeFile(storagePath, Buffer.from(await input.file.arrayBuffer()));

  return {
    storagePath,
    storedFileName,
  };
}

export function getIngestDocumentUrl(jobId: string) {
  return `/api/upload/${jobId}`;
}

export async function readPersistedIngestFile(storagePath: string) {
  const resolvedPath = path.resolve(storagePath);
  const resolvedRoot = path.resolve(INGEST_STORAGE_ROOT);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error('Stored file path is outside the ingest storage root.');
  }

  return readFile(resolvedPath);
}

export function mapIngestJobToQueueItem(job: {
  id: string;
  fileName: string;
  fileSize: number;
  ingestType: string;
  status: string;
  progress: number;
  mimeType: string;
  documentUrl?: string | null;
  rowCount?: number | null;
  createdEntries?: number | null;
  failedRows?: number | null;
  message?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  departmentId?: string | null;
  department?: { name: string } | null;
}): ProcessingQueueItem {
  return {
    id: job.id,
    fileName: job.fileName,
    fileSize: job.fileSize,
    ingestType:
      job.ingestType === 'csv_import' ? 'csv_import' : 'evidence_upload',
    status:
      job.status === 'queued' ||
      job.status === 'storing' ||
      job.status === 'parsing' ||
      job.status === 'importing' ||
      job.status === 'completed' ||
      job.status === 'failed'
        ? job.status
        : 'failed',
    progress: job.progress,
    uploadedAt: job.createdAt.toISOString(),
    mimeType: job.mimeType,
    departmentId: job.departmentId ?? null,
    departmentName: job.department?.name ?? null,
    message: job.message ?? null,
    rowCount: job.rowCount ?? null,
    createdEntries: job.createdEntries ?? null,
    failedRows: job.failedRows ?? null,
    documentUrl: job.documentUrl ?? null,
    error: job.errorMessage ?? undefined,
  };
}
