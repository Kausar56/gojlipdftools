export type Point = { x: number; y: number };

export type EditorElement =
  | {
      id: string;
      pageIndex: number;
      type: "text";
      xPt: number;
      yPt: number;
      widthPt: number;
      text: string;
      color: string;
      fontSizePt: number;
    }
  | {
      id: string;
      pageIndex: number;
      type: "rect" | "highlight" | "ellipse";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      color: string;
    }
  | {
      id: string;
      pageIndex: number;
      type: "image";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      dataUrl: string;
      mimeType: "image/png" | "image/jpeg";
    }
  | {
      id: string;
      pageIndex: number;
      type: "path";
      points: Point[];
      color: string;
      strokeWidthPt: number;
    }
  | {
      id: string;
      pageIndex: number;
      type: "line";
      x1Pt: number;
      y1Pt: number;
      x2Pt: number;
      y2Pt: number;
      color: string;
      strokeWidthPt: number;
    }
  | {
      id: string;
      pageIndex: number;
      type: "text-edit";
      itemIndex: number;
      xPt: number;
      topPt: number;
      widthPt: number;
      heightPt: number;
      baselinePt: number;
      fontSizePt: number;
      text: string;
      color: string;
    };

export type DetectedTextItem = {
  itemIndex: number;
  xPt: number;
  topPt: number;
  widthPt: number;
  heightPt: number;
  baselinePt: number;
  fontSizePt: number;
  str: string;
};

export function createElementId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
