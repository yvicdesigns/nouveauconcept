import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, User, X, Building, MapPin, Mail, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';

const AddContactModal = ({ open, onOpenChange, onContactSaved, contactToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Congo', // Updated default to Congo
    notes: '',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      if (contactToEdit) {
        setFormData({
          name: contactToEdit.name || '',
          email: contactToEdit.email || '',
          phone: contactToEdit.phone || '',
          company: contactToEdit.company || '',
          position: contactToEdit.position || '',
          address: contactToEdit.address || '',
          city: contactToEdit.city || '',
          postal_code: contactToEdit.postal_code || '',
          country: contactToEdit.country || 'Congo',
          notes: contactToEdit.notes || '',
          status: contactToEdit.status || 'Active'
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [open, contactToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Phone is optional
    // Remove spaces, dashes, dots for validation
    const cleanPhone = phone.replace(/[\s\-\.]/g, '');
    // Congo format: +242 followed by 8 or 9 digits
    const congoRegex = /^\+242[0-9]{8,9}$/;
    return congoRegex.test(cleanPhone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name) {
        throw new Error("Le nom est obligatoire.");
      }

      // Phone format validation (soft validation to allow saving but warn if strict needed, 
      // here we will enforce it slightly but allow if user insists? No, let's just enforce the format if provided)
      if (formData.phone && !validatePhone(formData.phone)) {
        throw new Error("Le numéro de téléphone doit être au format Congo : +242 suivi de 8 ou 9 chiffres (ex: +242061234567)");
      }

      const contactData = { ...formData };
      let resultData;

      if (contactToEdit) {
        // Update
        const { data, error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contactToEdit.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'contact_updated',
          title: `Contact modifié: ${data.name}`,
          description: `Mise à jour des informations pour ${data.name}.`,
          metadata: { contact_id: data.id, name: data.name }
        });

        toast({
          title: "Contact modifié",
          description: `Les informations de ${data.name} ont été mises à jour.`,
          className: "bg-green-50 border-green-200 text-green-900",
        });

      } else {
        // Create
        const { data, error } = await supabase
          .from('contacts')
          .insert([contactData])
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'contact_created',
          title: `Nouveau contact: ${data.name}`,
          description: `Ajout de ${data.name} à la base de contacts.`,
          metadata: { contact_id: data.id, name: data.name }
        });

        toast({
          title: "Contact ajouté",
          description: `${data.name} a été ajouté avec succès.`,
          className: "bg-green-50 border-green-200 text-green-900",
        });
      }

      if (onContactSaved) onContactSaved(resultData);
      onOpenChange(false);

    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!contactToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            {isEditing ? 'Modifier le contact' : 'Ajouter un contact'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du client ci-dessous." 
              : "Remplissez les informations pour ajouter un nouveau client ou prospect."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Informations Personnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Informations Principales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nom Complet *</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="ex: Jean Mokoko"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Active">Actif</option>
                  <option value="Inactive">Inactif</option>
                  <option value="Lead">Prospect</option>
                </select>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Coordonnées</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jean@exemple.cg"
                    className="w-full pl-9 p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+242 06 123 4567"
                    className="w-full pl-9 p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500">Format: +242 suivi de 8-9 chiffres</p>
              </div>
            </div>
          </div>

          {/* Informations Professionnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Professionnel</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Entreprise</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Brazza Tech"
                    className="w-full pl-9 p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Poste / Rôle</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Directeur Commercial"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Adresse</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Avenue de la Paix"
                    className="w-full pl-9 p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ville</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Brazzaville"
                    className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Code Postal</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="BP 1234"
                    className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pays</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Congo"
                    className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Observations ou informations importantes..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Modification...' : 'Enregistrement...'}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddContactModal;