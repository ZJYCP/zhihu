"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonsProps {
  title: string;
  author: string | null;
  url: string;
  content: string;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").slice(0, 100);
}

export function ExportButtons({ title, author, url, content }: ExportButtonsProps) {
  const safeTitle = sanitizeFilename(title);

  const exportMarkdown = () => {
    const md = `# ${title}

${author ? `**作者**: ${author}` : ""}
**原文链接**: ${url}

---

${content}
`;
    downloadFile(`${safeTitle}.md`, md, "text/markdown");
  };

  const exportText = () => {
    const txt = `${title}
${"=".repeat(title.length)}

${author ? `作者: ${author}` : ""}
原文链接: ${url}

${"-".repeat(50)}

${content}
`;
    downloadFile(`${safeTitle}.txt`, txt, "text/plain");
  };

  return (
    <div className="flex shrink-0 flex-nowrap gap-3">
      <Button variant="outline" onClick={exportMarkdown} className="whitespace-nowrap">
        <Download className="h-4 w-4 mr-2" />
        导出 Markdown
      </Button>
      <Button variant="outline" onClick={exportText} className="whitespace-nowrap">
        <Download className="h-4 w-4 mr-2" />
        导出文本
      </Button>
    </div>
  );
}
