import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, FileText, Download, Trash2, Loader2, FolderOpen, Upload, Filter, X, File, FileImage, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import usePagination from '@/hooks/usePagination';
import PaginationBar from '@/components/ui/PaginationBar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const CATEGORY_OPTIONS = ['Contrat', 'Facture', 'Assurance', 'Carte grise', 'Permis de conduire', 'Maintenance', 'Autre'];
const BUCKET = 'documents';

const getCategoryColor = (cat) => {
  switch (cat) {
    case 'Contrat':           return 'bg-blue-100 text-blue-700';
    case 'Facture':           return 'bg-green-100 text-green-700';
    case 'Assurance':         return 'bg-purple-100 text-purple-700';
    case 'Carte grise':       return 'bg-yellow-100 text-yellow-700';
    case 'Permis de conduire': return 'bg-orange-100 text-orange-700';
    case 'Maintenance':       return 'bg-red-100 text-red-700';
    default:                  return 'bg-slate-100 text-slate-700';
  }
};

const getFileIcon = (fileType) => {
  if (!fileType) return FileText;
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
  return File;
};

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
};

const Documents = () => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({ category: 'Autre', client_name: '', notes: '' });
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les documents.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openUploadModal = () => {
    setSelectedFile(null);
    setUploadForm({ category: 'Autre', client_name: '', notes: '' });
    setUploadProgress(0);
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: 'Fichier manquant', description: 'Veuillez sélectionner un fichier.', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const ext = selectedFile.name.split('.').pop();
      const storagePath = `${uploadForm.category}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      setUploadProgress(30);
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, selectedFile, { upsert: false });
      if (storageError) throw storageError;

      setUploadProgress(70);
      const { error: dbError } = await supabase.from('documents').insert([{
        name: selectedFile.name.replace(`.${ext}`, ''),
        original_name: selectedFile.name,
        storage_path: storagePath,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        category: uploadForm.category,
        client_name: uploadForm.client_name || null,
        notes: uploadForm.notes || null,
      }]);
      if (dbError) throw dbError;

      setUploadProgress(100);
      toast({ title: 'Document ajouté', className: 'bg-green-50 border-green-200 text-green-900' });
      setIsUploadModalOpen(false);
      fetchDocuments();
    } catch (err) {
      toast({ title: 'Erreur upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 60);
      if (error) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.original_name;
      a.click();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de télécharger le fichier.', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await supabase.storage.from(BUCKET).remove([docToDelete.storage_path]);
      const { error } = await supabase.from('documents').delete().eq('id', docToDelete.id);
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
      toast({ title: 'Document supprimé', className: 'bg-green-50 border-green-200 text-green-900' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  const filtered = documents.filter(d => {
    const matchSearch = !searchTerm ||
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.original_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !categoryFilter || d.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalSize = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
  const hasActiveFilters = searchTerm || categoryFilter;
  const { paginated, page, setPage, totalPages, total, from, perPage } = usePagination(filtered, 10);

  const stats = CATEGORY_OPTIONS.slice(0, 4).map(cat => ({
    label: cat,
    value: documents.filter(d => d.category === cat).length,
    color: getCategoryColor(cat),
  }));

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-600 mt-1">Stockez et organisez tous vos fichiers</p>
        </div>
        <Button onClick={openUploadModal} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
          <Upload className="h-4 w-4 mr-2" /> Ajouter un document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:col-span-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total</p>
          <p className="text-3xl font-bold text-slate-900">{documents.length}</p>
          <p className="text-xs text-slate-400 mt-1">{formatSize(totalSize)} utilisés</p>
        </motion.div>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.07 }}
            onClick={() => setCategoryFilter(categoryFilter === s.label ? '' : s.label)}
            className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all
              ${categoryFilter === s.label ? 'border-transparent ring-2 ring-blue-400 shadow-md' : 'border-slate-100'}`}>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            {categoryFilter === s.label && <p className="text-xs text-blue-500 mt-1 font-medium">Filtré</p>}
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Rechercher un document..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm text-slate-700">
                <option value="">Toutes les catégories</option>
                {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => { setSearchTerm(''); setCategoryFilter(''); }}
                    className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <X className="h-3.5 w-3.5" /> Effacer
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
          {hasActiveFilters && (
            <p className="mt-2 text-xs text-slate-500">
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <FolderOpen className="h-10 w-10 mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">{hasActiveFilters ? 'Aucun résultat' : 'Aucun document enregistré'}</p>
              {!hasActiveFilters && <p className="text-sm mt-1">Cliquez sur "Ajouter un document" pour commencer.</p>}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Taille</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((doc, index) => {
                  const FileIcon = getFileIcon(doc.file_type);
                  return (
                    <motion.tr key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }}
                      className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <FileIcon className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[220px]">{doc.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{doc.original_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(doc.category)}`}>
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{doc.client_name || '—'}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{formatSize(doc.file_size)}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" title="Télécharger"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Supprimer"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => { setDocToDelete(doc); setIsDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={total} from={from} perPage={perPage} />
        </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Ajouter un document</DialogTitle>
            <DialogDescription>Sélectionnez un fichier et renseignez ses informations.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="mt-4 space-y-4">
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <File className="h-8 w-8 text-blue-500" />
                  <p className="font-semibold text-slate-800 text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload className="h-8 w-8" />
                  <p className="text-sm font-medium">Cliquez pour sélectionner un fichier</p>
                  <p className="text-xs">PDF, images, Word, Excel…</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Catégorie</label>
                <select value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                  {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Client associé</label>
                <input type="text" value={uploadForm.client_name}
                  onChange={e => setUploadForm(p => ({ ...p, client_name: e.target.value }))}
                  placeholder="ex: Jean Dupont"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea value={uploadForm.notes} onChange={e => setUploadForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Informations complémentaires..."
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Upload en cours…</span><span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <motion.div className="bg-blue-500 h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px]" disabled={isUploading || !selectedFile}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" />Envoyer</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{docToDelete?.original_name}</strong> sera définitivement supprimé du stockage. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Documents;
