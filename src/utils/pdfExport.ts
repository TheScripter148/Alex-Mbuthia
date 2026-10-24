import jsPDF from 'jspdf';
import { CalculatedDimensions, ProjectState } from '../types';

export interface ExportOptions {
  format: 'pdf' | 'jpg' | 'png' | 'json';
  includeBleed: boolean;
  includeCropMarks: boolean;
  includeBarcodeArea: boolean;
  jpegQuality: number; // 0.8 to 1.0
  targetDpi: number; // default 300
}

export async function exportCoverToPdf(
  canvas: HTMLCanvasElement,
  dimensions: CalculatedDimensions,
  options: ExportOptions,
  filename = 'alexforge-book-cover'
): Promise<void> {
  const { totalWidthInches, totalHeightInches, trimWidthInches, trimHeightInches, bleedInches } = dimensions;

  // Initialize jsPDF with exact physical dimensions in inches
  const orientation = totalWidthInches > totalHeightInches ? 'landscape' : 'portrait';
  
  const doc = new jsPDF({
    orientation,
    unit: 'in',
    format: [totalWidthInches, totalHeightInches],
    compress: true,
  });

  // Convert canvas to high-res data URL
  const imgData = canvas.toDataURL('image/jpeg', options.jpegQuality || 0.96);

  // Add cover graphic exactly filling the specified physical dimensions
  doc.addImage(imgData, 'JPEG', 0, 0, totalWidthInches, totalHeightInches);

  // Optional: Draw professional print crop marks at trim edges
  if (options.includeCropMarks && bleedInches > 0) {
    const markLength = 0.25; // 1/4 inch
    const markOffset = 0.05; // 0.05 inch from trim
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.005); // 0.5 pt

    // Bleed boundaries: x = bleedInches, y = bleedInches, etc.
    const leftTrim = bleedInches;
    const rightTrim = totalWidthInches - bleedInches;
    const topTrim = bleedInches;
    const bottomTrim = totalHeightInches - bleedInches;

    // Top-Left corner crop marks
    doc.line(leftTrim, topTrim - markOffset - markLength, leftTrim, topTrim - markOffset);
    doc.line(leftTrim - markOffset - markLength, topTrim, leftTrim - markOffset, topTrim);

    // Top-Right corner crop marks
    doc.line(rightTrim, topTrim - markOffset - markLength, rightTrim, topTrim - markOffset);
    doc.line(rightTrim + markOffset, topTrim, rightTrim + markOffset + markLength, topTrim);

    // Bottom-Left corner crop marks
    doc.line(leftTrim, bottomTrim + markOffset, leftTrim, bottomTrim + markOffset + markLength);
    doc.line(leftTrim - markOffset - markLength, bottomTrim, leftTrim - markOffset, bottomTrim);

    // Bottom-Right corner crop marks
    doc.line(rightTrim, bottomTrim + markOffset, rightTrim, bottomTrim + markOffset + markLength);
    doc.line(rightTrim + markOffset, bottomTrim, rightTrim + markOffset + markLength, bottomTrim);

    // Spine fold marks if wrap
    if (dimensions.spineWidthInches > 0) {
      const spineLeft = dimensions.spineRegion.x / 300;
      const spineRight = (dimensions.spineRegion.x + dimensions.spineRegion.width) / 300;
      
      // Top spine indicators
      doc.line(spineLeft, topTrim - markOffset - (markLength * 0.6), spineLeft, topTrim - markOffset);
      doc.line(spineRight, topTrim - markOffset - (markLength * 0.6), spineRight, topTrim - markOffset);
      
      // Bottom spine indicators
      doc.line(spineLeft, bottomTrim + markOffset, spineLeft, bottomTrim + markOffset + (markLength * 0.6));
      doc.line(spineRight, bottomTrim + markOffset, spineRight, bottomTrim + markOffset + (markLength * 0.6));
    }
  }

  doc.save(`${filename}.pdf`);
}

export function exportCoverImage(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpg',
  quality = 0.95,
  filename = 'alexforge-book-cover'
): void {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, quality);
  
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportProjectFile(project: ProjectState, filename = 'alexforge-project'): void {
  const serialized = JSON.stringify(project, null, 2);
  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.afcover`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
