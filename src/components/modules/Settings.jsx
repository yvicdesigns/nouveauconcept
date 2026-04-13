import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Building, 
  CreditCard, 
  Bell, 
  Shield, 
  UserPlus, 
  Trash2, 
  User, 
  Upload, 
  Info, 
  Download,
  Mail,
  MessageSquare,
  Wrench,
  Loader2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    }`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Data states
  const [companyData, setCompanyData] = useState({
    id: null,
    name: 'Nouveau Concept',
    siret: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo_url: ''
  });

  const [toggles, setToggles] = useState({
    autoBilling: true,
    unlimitedMileage: false,
    emailNotifs: true,
    smsNotifs: false,
    maintenanceAlerts: true
  });

  // Fetch company settings on mount
  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid 406 if no rows exist yet

      if (error) throw error;

      if (data) {
        setCompanyData(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de charger les paramètres de l'entreprise."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "L'image doit faire moins de 2 Mo."
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setCompanyData(prev => ({ ...prev, logo_url: publicUrl }));
      
      toast({
        title: "Logo téléchargé",
        description: "Le logo a été mis à jour. Pensez à enregistrer.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        variant: "destructive",
        title: "Échec du téléchargement",
        description: "Vérifiez votre connexion ou réessayez plus tard."
      });
    } finally {
      setIsUploading(false);
      // Reset input value to allow re-uploading same file if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (activeTab === 'company') {
      await saveCompanySettings();
    } else {
      toast({
        title: "Modification enregistrée",
        description: "Les préférences locales ont été mises à jour (simulation).",
      });
    }
  };

  const saveCompanySettings = async () => {
    setIsSaving(true);
    try {
      // Remove ID if it's null to allow auto-generation on insert, 
      // or include it if we are updating.
      const payload = {
        ...companyData,
        updated_at: new Date()
      };
      
      if (!payload.id) {
        delete payload.id;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      setCompanyData(data);
      toast({
        title: "Paramètres enregistrés",
        description: "Les informations de l'entreprise ont été mises à jour avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description: "Impossible d'enregistrer les modifications."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'Entreprise', icon: Building },
    { id: 'billing', label: 'Facturation & Location', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité & Équipe', icon: Shield },
  ];

  const users = [
    { name: 'Jean Admin', role: 'Administrateur', lastLogin: 'À l\'instant', initials: 'JA', color: 'bg-purple-100 text-purple-700' },
    { name: 'Sophie Commerciale', role: 'Agent', lastLogin: 'Il y a 2h', initials: 'SC', color: 'bg-blue-100 text-blue-700' },
    { name: 'Marc Garage', role: 'Technicien', lastLogin: 'Hier', initials: 'MG', color: 'bg-gray-100 text-gray-700' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gray-50 rounded-xl">
                <Building className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Identité de l'entreprise</h2>
                <p className="text-sm text-gray-500 mt-1">Gérez les informations légales et publiques</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  {/* Logo Upload */}
                  <div className="md:col-span-1">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    <div 
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className={`
                        relative border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center 
                        transition-all cursor-pointer group overflow-hidden
                        ${companyData.logo_url ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}
                      `}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-2" />
                          <span className="text-xs text-blue-600 font-medium">Téléchargement...</span>
                        </div>
                      ) : companyData.logo_url ? (
                        <>
                          <img 
                            src={companyData.logo_url} 
                            alt="Logo entreprise" 
                            className="absolute inset-0 w-full h-full object-contain p-4" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-gray-50 rounded-full mb-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <Upload className="h-6 w-6 text-gray-400 group-hover:text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">Télécharger le logo</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-2">Format recommandé: PNG, JPG (max 2MB)</p>
                  </div>
                  
                  {/* Company Name & SIRET */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Nom de l'entreprise</label>
                        <input 
                          type="text" 
                          name="name"
                          value={companyData.name || ''}
                          onChange={handleCompanyChange}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" 
                          placeholder="Ex: Nouveau Concept"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Numéro SIRET</label>
                        <input 
                          type="text" 
                          name="siret"
                          value={companyData.siret || ''}
                          onChange={handleCompanyChange}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" 
                          placeholder="Ex: 123 456 789 00012"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Adresse du siège</label>
                      <input 
                        type="text" 
                        name="address"
                        value={companyData.address || ''}
                        onChange={handleCompanyChange}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" 
                        placeholder="Ex: Centre-ville, Brazzaville"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Email de contact</label>
                    <input 
                      type="email" 
                      name="email"
                      value={companyData.email || ''}
                      onChange={handleCompanyChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" 
                      placeholder="contact@entreprise.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Téléphone</label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={companyData.phone || ''}
                      onChange={handleCompanyChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" 
                      placeholder="+242 XX XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Site Web</label>
                  <input 
                    type="url" 
                    name="website"
                    value={companyData.website || ''}
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" 
                    placeholder="https://www.monsite.com"
                  />
                </div>
              </>
            )}
          </motion.div>
        );

      case 'billing':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gray-50 rounded-xl">
                <CreditCard className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Préférences de Location</h2>
                <p className="text-sm text-gray-500 mt-1">Configurez les paramètres financiers par défaut</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Devise</label>
                <select className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white shadow-sm">
                  <option>FCFA (XAF)</option>
                  <option>EUR (€)</option>
                  <option>USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">TVA par défaut (%)</label>
                <input type="number" defaultValue="18" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Caution standard (FCFA)</label>
                <input type="text" defaultValue="500000" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
              </div>
            </div>

            <div className="space-y-6 mb-10">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Règles automatiques</h3>
              
              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div>
                  <div className="text-sm font-bold text-gray-900">Facturation automatique</div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">Générer automatiquement la facture à la fin de la location</div>
                </div>
                <Toggle checked={toggles.autoBilling} onChange={() => handleToggle('autoBilling')} />
              </div>

              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div>
                  <div className="text-sm font-bold text-gray-900">Kilométrage illimité par défaut</div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">Appliquer le kilométrage illimité à toutes les nouvelles offres</div>
                </div>
                <Toggle checked={toggles.unlimitedMileage} onChange={() => handleToggle('unlimitedMileage')} />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-blue-900">Politique d'annulation</h3>
                  <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                    Les conditions générales de vente (CGV) sont jointes aux contrats générés.
                  </p>
                  <button className="text-xs font-bold text-blue-700 hover:text-blue-900 underline mt-3 flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    Télécharger le modèle actuel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gray-50 rounded-xl">
                <Bell className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Configuration des Alertes</h2>
                <p className="text-sm text-gray-500 mt-1">Choisissez comment vous souhaitez être notifié</p>
              </div>
            </div>

            <div className="space-y-8 mb-10">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="mt-0.5">
                    <h3 className="text-sm font-bold text-gray-900">Notifications par Email</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Recevoir un email pour chaque nouvelle réservation</p>
                  </div>
                </div>
                <Toggle checked={toggles.emailNotifs} onChange={() => handleToggle('emailNotifs')} />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-8">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="mt-0.5">
                    <h3 className="text-sm font-bold text-gray-900">Notifications SMS (Client)</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Envoyer un rappel SMS au client 24h avant le début de location</p>
                  </div>
                </div>
                <Toggle checked={toggles.smsNotifs} onChange={() => handleToggle('smsNotifs')} />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-8">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Wrench className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="mt-0.5">
                    <h3 className="text-sm font-bold text-gray-900">Alertes Maintenance</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Être notifié quand un véhicule atteint son seuil de kilométrage ou date d'entretien</p>
                  </div>
                </div>
                <Toggle checked={toggles.maintenanceAlerts} onChange={() => handleToggle('maintenanceAlerts')} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-8">
              <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wide">Seuils de Maintenance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Alerte km (tous les)</label>
                  <div className="relative">
                    <input type="number" defaultValue="15000" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
                    <span className="absolute right-4 top-2.5 text-sm font-medium text-gray-400">km</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Alerte durée (tous les)</label>
                  <div className="relative">
                    <input type="number" defaultValue="12" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
                    <span className="absolute right-4 top-2.5 text-sm font-medium text-gray-400">mois</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                  <Shield className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Gestion de l'équipe</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Gérez les accès et les rôles</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-medium shadow-sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter
              </Button>
            </div>

            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-4 pl-2">Utilisateur</th>
                      <th className="pb-4">Rôle</th>
                      <th className="pb-4">Dernière connexion</th>
                      <th className="pb-4 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user, index) => (
                      <tr key={index} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-5 pl-2">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 border border-gray-200 shadow-sm">
                              {user.initials}
                            </div>
                            <span className="font-bold text-gray-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            user.role === 'Administrateur' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'Agent' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-5 text-sm text-gray-500 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                            {user.lastLogin}
                          </div>
                        </td>
                        <td className="py-5 text-right pr-2">
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-10 bg-yellow-50 border border-yellow-100 rounded-xl p-5 flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <User className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-yellow-900">Authentification à deux facteurs (2FA)</h3>
                  <p className="text-sm text-yellow-800 mt-1 leading-relaxed">
                    Recommandé pour les comptes administrateur. <button className="underline font-bold hover:text-yellow-950 decoration-yellow-700/50 hover:decoration-yellow-950">Activer maintenant.</button>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Paramètres</h1>
          <p className="text-gray-500 mt-1 font-medium">Gérez les informations de votre entreprise et les préférences du CRM.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg px-6 font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer les modifications"
          )}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar - Settings Navigation */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;