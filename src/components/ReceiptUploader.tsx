import React, { useRef } from 'react';
import { AttachmentItem } from '../types';
import { Paperclip, Image, Trash2, Eye, UploadCloud } from 'lucide-react';

interface Props {
  attachments: AttachmentItem[];
  onChange: (attachments: AttachmentItem[]) => void;
  onViewAttachment?: (attachment: AttachmentItem) => void;
}

export const ReceiptUploader: React.FC<Props> = ({
  attachments,
  onChange,
  onViewAttachment,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Limite razoável para armazenamento em localStorage (ex: até 4MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" excede o tamanho máximo permitido de 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const newAttachment: AttachmentItem = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nome: file.name,
          dataUrl,
          tipo: file.type || 'application/octet-stream',
          tamanho: formatFileSize(file.size),
          criadoEm: Date.now(),
        };

        onChange([...attachments, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wide flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-blue-400" />
          <span>Comprovantes & Anexos ({attachments.length})</span>
        </label>
        <span className="text-[10px] text-neutral-400">Fotos, recibos ou faturas (até 5MB)</span>
      </div>

      {/* Botão de Upload / Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border border-dashed border-white/20 hover:border-blue-500/60 bg-black/40 hover:bg-black/60 rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-1"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 text-blue-400 flex items-center justify-center transition-transform">
          <UploadCloud className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-white group-hover:text-blue-300 transition-colors">
          Toque para anexar comprovante
        </span>
        <span className="text-[10px] text-neutral-400">
          Tire foto do recibo ou envie imagem da galeria/PDF
        </span>
      </div>

      {/* Lista de Comprovantes Anexados */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {attachments.map((att) => {
            const isImage = att.tipo.startsWith('image/') || att.dataUrl.startsWith('data:image/');
            return (
              <div
                key={att.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all gap-2"
              >
                <div
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onViewAttachment && onViewAttachment(att)}
                >
                  {isImage ? (
                    <img
                      src={att.dataUrl}
                      alt={att.nome}
                      className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
                      <Image className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">{att.nome}</p>
                    <p className="text-[10px] text-neutral-400">{att.tamanho || 'Anexo'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onViewAttachment && (
                    <button
                      type="button"
                      onClick={() => onViewAttachment(att)}
                      title="Ver comprovante"
                      className="p-1 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id)}
                    title="Remover anexo"
                    className="p-1 rounded-lg text-neutral-300 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
