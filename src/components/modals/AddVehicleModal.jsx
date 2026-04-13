import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, Car, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { addYears, addMonths, format, isValid, parseISO } from 'date-fns';

const AddVehicleModal = ({ open, onOpenChange, onVehicleSaved, vehicleToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  
  const initialFormState = {
    name: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    category: 'Berline',
    color: '',
    mileage: 0,
    purchase_price: '',
    daily_rate: '',
    status: 'DISPONIBLE',
    fuel_type: 'Essence',
    transmission: 'Automatique',
    seats: 5,
    notes: '',
    image_url: '',
    // Technical fields
    chassis_number: '',
    acquisition_date: '',
    breakdown_type: '',
    anomaly: '',
    // Insurance & Technical Control
    last_insurance_date: '',
    insurance_expiry_date: '',
    last_technical_check_date: '',
    technical_check_expiry_date: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      if (vehicleToEdit) {
        // If editing, populate form with vehicle data
        const data = vehicleToEdit.rawData || vehicleToEdit;
        
        setFormData({
          name: data.name || '',
          brand: data.brand || '',
          model: data.model || '',
          year: data.year || new Date().getFullYear(),
          license_plate: data.license_plate || data.plate || '',
          category: data.category || 'Berline',
          color: data.color || '',
          mileage: typeof data.mileage === 'string' ? parseInt(data.mileage.replace(/\D/g, '')) : (data.mileage || 0),
          purchase_price: data.purchase_price || '',
          daily_rate: typeof data.daily_rate === 'number' ? data.daily_rate : (data.price ? parseInt(data.price.replace(/\D/g, '')) : ''),
          status: data.status || 'DISPONIBLE',
          fuel_type: data.fuel_type || data.fuel || 'Essence',
          transmission: data.transmission || 'Automatique',
          seats: data.seats || 5,
          notes: data.notes || '',
          image_url: data.image_url || '',
          // Technical fields mapping
          chassis_number: data.chassis_number || '',
          acquisition_date: data.acquisition_date || '',
          breakdown_type: data.breakdown_type || '',
          anomaly: data.anomaly || '',
          // Insurance & Technical Control
          last_insurance_date: data.last_insurance_date || '',
          insurance_expiry_date: data.insurance_expiry_date || '',
          last_technical_check_date: data.last_technical_check_date || '',
          technical_check_expiry_date: data.technical_check_expiry_date || ''
        });
        setPreviewUrl(data.image_url || null);
      } else {
        // If adding, reset to initial state
        setFormData(initialFormState);
        setPreviewUrl(null);
      }
      setSelectedImage(null);
    }
  }, [open, vehicleToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-calculate Insurance Expiry (+1 Year)
      if (name === 'last_insurance_date' && value) {
        try {
          const startDate = parseISO(value);
          if (isValid(startDate)) {
            const expiryDate = addYears(startDate, 1);
            newData.insurance_expiry_date = format(expiryDate, 'yyyy-MM-dd');
          }
        } catch (err) {
          console.error("Invalid insurance date", err);
        }
      }

      // Auto-calculate Technical Check Expiry (+6 Months)
      if (name === 'last_technical_check_date' && value) {
        try {
          const startDate = parseISO(value);
          if (isValid(startDate)) {
            const expiryDate = addMonths(startDate, 6);
            newData.technical_check_expiry_date = format(expiryDate, 'yyyy-MM-dd');
          }
        } catch (err) {
           console.error("Invalid technical check date", err);
        }
      }

      return newData;
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Fichier trop volumineux",
          description: "L'image ne doit pas dépasser 5 Mo.",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Validate
      if (!formData.name || !formData.license_plate || !formData.daily_rate) {
        throw new Error("Veuillez remplir les champs obligatoires (Nom, Immatriculation, Prix journalier).");
      }

      let imageUrl = formData.image_url;

      // 2. Upload Image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const vehicleData = {
        ...formData,
        year: parseInt(formData.year),
        mileage: parseInt(formData.mileage),
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        daily_rate: parseFloat(formData.daily_rate),
        seats: parseInt(formData.seats),
        image_url: imageUrl,
        // Ensure empty strings are null for date/numeric fields if necessary, but date can be string
        acquisition_date: formData.acquisition_date || null,
        last_insurance_date: formData.last_insurance_date || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        last_technical_check_date: formData.last_technical_check_date || null,
        technical_check_expiry_date: formData.technical_check_expiry_date || null
      };

      let resultData;

      if (vehicleToEdit && vehicleToEdit.isDb) {
        // UPDATE existing vehicle in DB
        const { data, error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', vehicleToEdit.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'vehicle_updated',
          title: `Véhicule modifié: ${data.name}`,
          description: `Mise à jour des informations pour ${data.brand} ${data.model}.`,
          vehicleId: data.id,
          metadata: { changes: Object.keys(vehicleData) }
        });

        toast({
          title: "Véhicule modifié",
          description: `Les modifications pour ${data.name} ont été enregistrées.`,
          className: "bg-green-50 border-green-200 text-green-900",
        });

      } else if (vehicleToEdit && !vehicleToEdit.isDb) {
         // Mock update
         resultData = { ...vehicleToEdit, ...vehicleData };
         toast({ title: "Modifié (Local)", description: "Données mises à jour localement." });
      } else {
        // CREATE new vehicle
        const { data, error } = await supabase
          .from('vehicles')
          .insert([vehicleData])
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'vehicle_created',
          title: `Nouveau véhicule: ${data.name}`,
          description: `Ajout de ${data.brand} ${data.model} à la flotte.`,
          vehicleId: data.id
        });

        toast({
          title: "Véhicule ajouté",
          description: `${data.name} a été ajouté avec succès.`,
          className: "bg-green-50 border-green-200 text-green-900",
        });
      }

      if (onVehicleSaved) onVehicleSaved(resultData);
      onOpenChange(false);

    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!vehicleToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            {isEditing ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du véhicule ci-dessous." 
              : "Remplissez les informations ci-dessous pour ajouter un nouveau véhicule à votre flotte."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Photo du véhicule</h3>
            <div className="flex flex-col items-center justify-center w-full">
              {previewUrl ? (
                <div className="relative w-full max-w-md h-64 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50 group">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Changer
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full max-w-md h-64 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="p-4 bg-blue-50 rounded-full mb-3">
                      <ImageIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="mb-2 text-sm text-slate-700"><span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez</p>
                    <p className="text-xs text-slate-500">PNG, JPG ou WEBP (MAX. 5MB)</p>
                  </div>
                </div>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageSelect}
              />
            </div>
          </div>

          {/* Identification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nom du véhicule *</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="ex: Peugeot 3008 GT"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Marque *</label>
                <input
                  required
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="ex: Peugeot"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modèle *</label>
                <input
                  required
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="ex: 3008"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Immatriculation *</label>
                <input
                  required
                  type="text"
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleChange}
                  placeholder="ex: AB-123-CD"
                  className="w-full p-2 border border-slate-200 rounded-md uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Année</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Couleur</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="ex: Gris, Noir..."
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Numéro de Chassis</label>
                <input
                  type="text"
                  name="chassis_number"
                  value={formData.chassis_number}
                  onChange={handleChange}
                  placeholder="ex: VF3..."
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date d'acquisition</label>
                <input
                  type="date"
                  name="acquisition_date"
                  value={formData.acquisition_date}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Caractéristiques */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Caractéristiques</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Berline">Berline</option>
                  <option value="SUV">SUV</option>
                  <option value="Citadine">Citadine</option>
                  <option value="Utilitaire">Utilitaire</option>
                  <option value="Luxe">Luxe</option>
                  <option value="Pickup">Pickup</option>
                  <option value="4x4">4x4</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Carburant</label>
                <select
                  name="fuel_type"
                  value={formData.fuel_type}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Essence">Essence</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybride">Hybride</option>
                  <option value="Électrique">Électrique</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Transmission</label>
                <select
                  name="transmission"
                  value={formData.transmission}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Manuelle">Manuelle</option>
                  <option value="Automatique">Automatique</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Kilométrage (km)</label>
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  min="0"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nombre de places</label>
                <input
                  type="number"
                  name="seats"
                  value={formData.seats}
                  onChange={handleChange}
                  min="1"
                  max="60"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          
           {/* Documents (Assurance & CT) */}
           <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Documents & Validité</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Assurance */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700">Assurance</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">Début</label>
                    <input
                      type="date"
                      name="last_insurance_date"
                      value={formData.last_insurance_date}
                      onChange={handleChange}
                      className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">Expiration</label>
                    <input
                      type="date"
                      name="insurance_expiry_date"
                      value={formData.insurance_expiry_date}
                      onChange={handleChange}
                      className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                    <p className="text-xs text-slate-400 italic">Auto: +1 an</p>
                  </div>
                </div>
              </div>

              {/* Contrôle Technique */}
               <div className="space-y-4">
                <h4 className="font-medium text-slate-700">Contrôle Technique</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">Début</label>
                    <input
                      type="date"
                      name="last_technical_check_date"
                      value={formData.last_technical_check_date}
                      onChange={handleChange}
                      className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">Expiration</label>
                    <input
                      type="date"
                      name="technical_check_expiry_date"
                      value={formData.technical_check_expiry_date}
                      onChange={handleChange}
                      className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                    <p className="text-xs text-slate-400 italic">Auto: +6 mois</p>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Tarification & Statut */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Finances & Statut</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prix Journalier (FCFA) *</label>
                <input
                  required
                  type="number"
                  name="daily_rate"
                  value={formData.daily_rate}
                  onChange={handleChange}
                  placeholder="ex: 25000"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prix d'Achat (FCFA)</label>
                <input
                  type="number"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  placeholder="Optionnel"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut Initial</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="LOUÉ">LOUÉ</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="RÉSERVÉ">RÉSERVÉ</option>
                  <option value="PRÊTÉ">PRÊTÉ</option>
                </select>
              </div>
            </div>
          </div>
          
           {/* New Status Details */}
           <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">État Technique & Anomalies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type de panne (si applicable)</label>
                <input
                  type="text"
                  name="breakdown_type"
                  value={formData.breakdown_type}
                  onChange={handleChange}
                  placeholder="ex: Problème moteur, crevaison..."
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Anomalies signalées</label>
                <input
                  type="text"
                  name="anomaly"
                  value={formData.anomaly}
                  onChange={handleChange}
                  placeholder="ex: Voyant ABS allumé"
                  className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes & Observations</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Informations supplémentaires..."
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
                  {isEditing ? 'Modification...' : 'Ajout...'}
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

export default AddVehicleModal;