import React from 'react';
import { AttachmentItem } from '../types';
import { X, Download, FileText, Trash2, Calendar, File } from 'lucide-react';
import { formatDateBr } from '../utils/formatters';

interface Props {
  attachment: AttachmentItem;
  onClose: () => void;
  onDelete?: () => void;
}

export const ReceiptViewerModal: React.FC<Props> = ({
  attachment,
  onClose,
  onDelete,
}) => {
  const isImage = attachment.tipo.startsWith('image/') || attachment.dataUrl.startsWith('data:image/');
  const isPdf = attachment.tipo.includes('pdf') || attachment.dataUrl.includes('application/pdf');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.nome || 'comprovante';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#12131A] border border-white/20 rounded-2xl shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              {isImage ? <FileText className="w-4 h-4" /> : <File className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                {attachment.nome || 'Comprovante Anexado'}
              </h3>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-neutral-500" />
                <span>Anexado em {formatDateBr(new Date(attachment.criadoEm).toISOString().split('T')[0])}</span>
                {attachment.tamanho && <span>· {attachment.tamanho}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              title="Baixar comprovante"
              className="p-2 rounded-xl text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja excluir este comprovante anexo?')) {
                    onDelete();
                    onClose();
                  }
                }}
                title="Excluir comprovante"
                className="p-2 rounded-xl text-neutral-300 hover:text-rose-300 bg-white/5 hover:bg-rose-500/20 border border-white/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visualizador do Conteúdo */}
        <div className="flex-1 p-3 sm:p-5 flex items-center justify-center bg-black/60 overflow-auto min-h-[300px]">
          {isImage ? (
            <img
              src={attachment.dataUrl}
              alt={attachment.nome}
              className="max-w-full max-h-[65vh] object-contain rounded-xl border border-white/10 shadow-lg"
            />
          ) : isPdf ? (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center">
              <iframe
                src={attachment.dataUrl}
                title="Visualizador PDF"
                className="w-full h-full rounded-xl border border-white/10"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-white/5 border border-white/10 rounded-2xl">
              <FileText className="w-12 h-12 text-blue-400 mb-2" />
              <p className="text-white font-medium text-sm mb-1">{attachment.nome}</p>
              <p className="text-xs text-neutral-400 mb-4">Documento anexo ({attachment.tipo})</p>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Documento</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
