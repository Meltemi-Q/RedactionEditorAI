import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        onImageSelected(base64Data);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelected]);

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <label 
        className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-850 hover:bg-slate-800 hover:border-blue-500 transition-all group"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="p-4 rounded-full bg-slate-900 group-hover:bg-blue-500/10 mb-4 transition-colors">
            <Upload className="w-10 h-10 text-slate-400 group-hover:text-blue-400" />
          </div>
          <p className="mb-2 text-lg text-slate-300 font-medium">点击上传截图</p>
          <p className="text-sm text-slate-500">支持格式: PNG, JPG, WEBP</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
      
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 w-full text-center">
          适用场景
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center text-sm text-slate-400">
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
           聊天记录
        </div>
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
           银行账单
        </div>
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
           订单详情
        </div>
      </div>
    </div>
  );
};