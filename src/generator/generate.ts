import {
  createProfileManifest,
  type GeneratedProfileManifest,
  type ProfileTopologyCounts,
} from "./manifest";
import {
  columnCountForReport,
  getSyntheticProfile,
  rowCountForReport,
  type SyntheticProfileName,
} from "./profiles";
import { SeededRandom } from "./seed";

type AliasMode = "lowercase" | "pascal" | "mixed";
type SyntheticScalar = string | number | boolean | null;

export interface GeneratedSyntheticProfile {
  readonly request: unknown;
  readonly json: string;
  readonly manifest: GeneratedProfileManifest;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

function aliasModeFor(index: number): AliasMode {
  const remainder = index % 3;
  if (remainder === 0) {
    return "lowercase";
  }
  if (remainder === 1) {
    return "pascal";
  }
  return "mixed";
}

function syntheticScalar(
  ordinal: number,
  token: string,
  stringPrefix: string,
): SyntheticScalar {
  switch (ordinal % 4) {
    case 0:
      return `${stringPrefix}-${token}`;
    case 1:
      return 10_000 + ordinal;
    case 2:
      return ordinal % 2 === 0;
    default:
      return null;
  }
}

function createHeader(
  reportNumber: number,
  mode: AliasMode,
  random: SeededRandom,
): Record<string, unknown> {
  const reportId = pad(reportNumber, 6);
  const title = ` Synthetic Title R${reportId}-${random.token()} `;
  const alternateTitle = `Synthetic Alternate Title R${reportId}-${random.token()}`;
  const subtitle = `Synthetic Subtitle R${reportId}-${random.token()}`;
  const labelArray = JSON.stringify([
    `Synthetic Header Label R${reportId}-${random.token()}`,
    `Synthetic Header Label R${reportId}-${random.token()}`,
  ]);
  const valueArray = JSON.stringify([
    `Synthetic Header Value R${reportId}-${random.token()}`,
    reportNumber,
    reportNumber % 2 === 0,
    null,
  ]);
  const header: Record<string, unknown> = {
    syntheticHeaderNote: `SYNTHETIC-HEADER-NOTE-R${reportId}-${random.token()}`,
  };

  switch (mode) {
    case "lowercase":
      header.title = title;
      header.subtitle = reportNumber % 4 === 0 ? "" : subtitle;
      header.label = labelArray;
      header.value = valueArray;
      header.timePeriod = `Synthetic Period R${reportId}`;
      header.missionStatement = `Synthetic Mission R${reportId}-${random.token()}`;
      break;
    case "pascal":
      header.Title = title;
      header.ReportSubtitle = subtitle;
      header.Label = labelArray;
      header.Value = valueArray;
      header.AcademicYear = `Synthetic Period R${reportId}`;
      header.MissionStatement = `Synthetic Mission R${reportId}-${random.token()}`;
      break;
    case "mixed":
      header.title = title;
      header.Title = alternateTitle;
      header.subtitle = "";
      header.ReportSubtitle = subtitle;
      header.label = labelArray;
      header.Value = valueArray;
      header.academic_year = `Synthetic Period R${reportId}`;
      header.mission_statement = `Synthetic Mission R${reportId}-${random.token()}`;
      break;
  }

  return header;
}

function createBusinessObject(
  reportNumber: number,
  mode: AliasMode,
  random: SeededRandom,
): Record<string, unknown> {
  const reportId = pad(reportNumber, 6);
  const name = ` Synthetic Object R${reportId}-${random.token()} `;
  const alternateName = `Synthetic Alternate Object R${reportId}-${random.token()}`;
  const code = syntheticScalar(
    reportNumber,
    random.token(),
    `SYNTHETIC-CODE-R${reportId}`,
  );
  const id = syntheticScalar(
    reportNumber + 1,
    random.token(),
    `SYNTHETIC-ID-R${reportId}`,
  );
  const status =
    reportNumber % 5 === 0
      ? ""
      : `SYNTHETIC-STATUS-${reportNumber % 2 === 0 ? "ACTIVE" : "PENDING"}`;
  const businessObject: Record<string, unknown> = {
    syntheticObjectNote: `SYNTHETIC-OBJECT-NOTE-R${reportId}-${random.token()}`,
  };

  switch (mode) {
    case "lowercase":
      businessObject.name = name;
      businessObject.code = code;
      businessObject.id = id;
      businessObject.status = status;
      break;
    case "pascal":
      businessObject.Name = name;
      businessObject.Code = code;
      businessObject.Id = id;
      businessObject.Status = status;
      break;
    case "mixed":
      businessObject.Name = name;
      businessObject.name = alternateName;
      businessObject.Code = code;
      businessObject.code = `SYNTHETIC-ALTERNATE-CODE-R${reportId}-${random.token()}`;
      businessObject.id = id;
      businessObject.Status = status;
      break;
  }

  return businessObject;
}

function createColumn(
  reportNumber: number,
  columnNumber: number,
  mode: AliasMode,
  random: SeededRandom,
): Record<string, unknown> {
  const reportId = pad(reportNumber, 6);
  const columnId = pad(columnNumber, 2);
  const key = ` synthetic_column_${columnId} `;
  const alternateKey = `synthetic_column_alias_${columnId}`;
  const header = ` Synthetic Column ${columnId} `;
  const column: Record<string, unknown> = {
    syntheticColumnNote: `SYNTHETIC-COLUMN-NOTE-R${reportId}-C${columnId}-${random.token()}`,
  };

  switch (mode) {
    case "lowercase":
      column.key = key;
      if (columnNumber % 3 !== 0) {
        column.header = header;
      }
      break;
    case "pascal":
      column.Key = key;
      if (columnNumber % 3 !== 0) {
        column.Header = header;
      }
      break;
    case "mixed":
      column.key = key;
      column.Key = alternateKey;
      column.header = header;
      column.Header = `Synthetic Alternate Column ${columnId}`;
      break;
  }

  return column;
}

function createCell(
  reportNumber: number,
  rowNumber: number,
  columnNumber: number,
  mode: AliasMode,
  random: SeededRandom,
): Record<string, unknown> {
  const reportId = pad(reportNumber, 6);
  const rowId = pad(rowNumber, 3);
  const columnId = pad(columnNumber, 2);
  const label = ` Synthetic Cell R${reportId}-ROW${rowId}-C${columnId}-${random.token()} `;
  const alternateLabel = `Synthetic Alternate Cell R${reportId}-ROW${rowId}-C${columnId}-${random.token()}`;
  const value = syntheticScalar(
    reportNumber + rowNumber + columnNumber,
    random.token(),
    `SYNTHETIC-VALUE-R${reportId}-ROW${rowId}-C${columnId}`,
  );
  const alternateValue = `SYNTHETIC-ALTERNATE-VALUE-R${reportId}-ROW${rowId}-C${columnId}-${random.token()}`;
  const cell: Record<string, unknown> = {
    syntheticCellNote: `SYNTHETIC-CELL-NOTE-R${reportId}-ROW${rowId}-C${columnId}-${random.token()}`,
  };

  switch (mode) {
    case "lowercase":
      cell.label = label;
      cell.value = value;
      break;
    case "pascal":
      cell.Label = label;
      cell.Value = value;
      break;
    case "mixed":
      cell.label = label;
      cell.Label = alternateLabel;
      cell.value = value;
      cell.Value = alternateValue;
      break;
  }

  return cell;
}

function createReport(
  reportIndex: number,
  columnCount: number,
  rowCount: number,
  random: SeededRandom,
): Record<string, unknown> {
  const reportNumber = reportIndex + 1;
  const reportId = pad(reportNumber, 6);
  const reportMode = aliasModeFor(reportIndex);
  const header = createHeader(reportNumber, reportMode, random);
  const businessObject = createBusinessObject(reportNumber, reportMode, random);
  const columns: Record<string, unknown>[] = [];
  const rows: Record<string, unknown>[] = [];

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    columns.push(
      createColumn(
        reportNumber,
        columnIndex + 1,
        aliasModeFor(reportIndex + columnIndex),
        random,
      ),
    );
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cells: Record<string, unknown>[] = [];
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      cells.push(
        createCell(
          reportNumber,
          rowIndex + 1,
          columnIndex + 1,
          aliasModeFor(reportIndex + rowIndex + columnIndex),
          random,
        ),
      );
    }

    rows.push({ [`synthetic_row_${pad(rowIndex + 1, 3)}`]: cells });
  }

  const table: Record<string, unknown> = {
    columns,
    rows,
    syntheticTableNote: `SYNTHETIC-TABLE-NOTE-R${reportId}-${random.token()}`,
  };
  const report: Record<string, unknown> = {
    syntheticReportNote: `SYNTHETIC-REPORT-NOTE-R${reportId}-${random.token()}`,
  };

  if (reportNumber % 5 === 0) {
    report.templateName = "";
  } else if (reportNumber % 5 !== 1) {
    report.templateName = `synthetic-template-${pad((reportNumber % 7) + 1, 2)}`;
  }

  switch (reportMode) {
    case "lowercase":
      report.header = header;
      report.businessObject = businessObject;
      report.table = table;
      break;
    case "pascal":
      report.Header = header;
      report.BusinessObject = businessObject;
      report.Table = table;
      break;
    case "mixed":
      report.header = header;
      report.BusinessObject = businessObject;
      report.table = table;
      break;
  }

  return report;
}

export function generateSyntheticProfile(
  profileName: SyntheticProfileName,
  seed: number,
): GeneratedSyntheticProfile {
  const profile = getSyntheticProfile(profileName);
  const random = new SeededRandom(seed);
  const reports: Record<string, unknown>[] = [];
  let totalColumns = 0;
  let totalRows = 0;
  let totalCells = 0;
  let minimumCells = Number.POSITIVE_INFINITY;
  let maximumCells = 0;

  for (let reportIndex = 0; reportIndex < profile.reportCount; reportIndex += 1) {
    const columnCount = columnCountForReport(profile, reportIndex);
    const rowCount = rowCountForReport(profile, reportIndex);
    const cellCount = columnCount * rowCount;
    reports.push(
      createReport(reportIndex, columnCount, rowCount, random),
    );
    totalColumns += columnCount;
    totalRows += rowCount;
    totalCells += cellCount;
    minimumCells = Math.min(minimumCells, cellCount);
    maximumCells = Math.max(maximumCells, cellCount);
  }

  const request: unknown = { data: reports };
  const json = `${JSON.stringify(request)}\n`;
  const topology: ProfileTopologyCounts = {
    reportCount: profile.reportCount,
    columns: {
      total: totalColumns,
      minimumPerReport: profile.columnsPerReport.minimum,
      maximumPerReport: profile.columnsPerReport.maximum,
    },
    rows: {
      total: totalRows,
      minimumPerReport: profile.rowsPerReport.minimum,
      maximumPerReport: profile.rowsPerReport.maximum,
    },
    cells: {
      total: totalCells,
      minimumPerReport: minimumCells,
      maximumPerReport: maximumCells,
    },
  };

  return {
    request,
    json,
    manifest: createProfileManifest(
      profileName,
      seed,
      request,
      json,
      topology,
    ),
  };
}
