import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityMediaUploadProps {
  fotos: string[];
  videoUrl: string | null;
  onFotosChange: (urls: string[]) => void;
  onVideoChange: (url: string | null) => void;
  disabled?: boolean;
}

const MAX_FOTO = 2;
const MAX_FOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB

export const SecurityMediaUpload: React.FC<SecurityMediaUploadProps> = ({
  fotos,
  videoUrl,
  onFotosChange,
  onVideoChange,
  disabled,
}) => {
  const { toast } = useToast();
  const fotoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const upload = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `security-log/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
  };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotos.length >= MAX_FOTO) {
      toast({ title: 'Maks 2 foto', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FOTO_SIZE) {
      toast({ title: 'Foto terlalu besar', description: 'Maks 5 MB.', variant: 'destructive' });
      return;
    }
    setUploadingFoto(true);
    try {
      const url = await upload(file, 'foto');
      onFotosChange([...fotos, url]);
    } catch (err: any) {
      toast({ title: 'Upload gagal', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingFoto(false);
      if (fotoRef.current) fotoRef.current.value = '';
    }
  };

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE) {
      toast({ title: 'Video terlalu besar', description: 'Maks 30 MB.', variant: 'destructive' });
      return;
    }
    setUploadingVideo(true);
    try {
      const url = await upload(file, 'video');
      onVideoChange(url);
    } catch (err: any) {
      toast({ title: 'Upload gagal', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingVideo(false);
      if (videoRef.current) videoRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Fotos */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">
          Foto ({fotos.length}/{MAX_FOTO})
        </div>
        <div className="flex flex-wrap gap-2">
          {fotos.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-md overflow-hidden border bg-muted">
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onFotosChange(fotos.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {!disabled && fotos.length < MAX_FOTO && (
            <>
              <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fotoRef.current?.click()}
                disabled={uploadingFoto}
                className="h-20 w-20 flex-col gap-1"
              >
                {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <span className="text-[10px]">Foto</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Video */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Video (maks 1, 30 MB)</div>
        {videoUrl ? (
          <div className="relative inline-block">
            <video src={videoUrl} controls className="max-h-32 rounded-md border" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onVideoChange(null)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          !disabled && (
            <>
              <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideo} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videoRef.current?.click()}
                disabled={uploadingVideo}
              >
                {uploadingVideo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                Pilih Video
              </Button>
            </>
          )
        )}
      </div>
    </div>
  );
};
