import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Gauge, Fuel, Settings2, Calendar, History as HistoryIcon, Pencil, Trash2, Loader2, AlertCircle, MoreHorizontal, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import VehicleCheckModal from '@/components/modals/VehicleCheckModal';
import AddVehicleModal from '@/components/modals/AddVehicleModal';
import AddLoanModal from '@/components/modals/AddLoanModal';
import HistoryTab from '@/components/history/HistoryTab';
import { historyService } from '@/lib/historyService';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

const Vehicles = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals State
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkModalType, setCheckModalType] = useState('checkout'); // 'checkout' or 'checkin'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  
  // New Modals State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  const [vehicles, setVehicles] = useState([]);

  // Fetch vehicles from Supabase
  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }

      if (data) {
        const mappedVehicles = data.map(mapDbVehicleToUi);
        setVehicles(mappedVehicles);
      } else {
        setVehicles([]);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de récupérer la liste des véhicules.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'DISPONIBLE': return 'bg-green-100 text-green-700';
      case 'LOUÉ': return 'bg-blue-100 text-blue-700';
      case 'MAINTENANCE': return 'bg-red-100 text-red-700';
      case 'RÉSERVÉ': return 'bg-yellow-100 text-yellow-800';
      case 'PRÊTÉ': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const mapDbVehicleToUi = (dbVehicle) => ({
    id: dbVehicle.id,
    name: dbVehicle.name,
    year: dbVehicle.year,
    plate: dbVehicle.license_plate,
    price: `${Number(dbVehicle.daily_rate).toLocaleString()} FCFA`,
    status: dbVehicle.status,
    mileage: `${Number(dbVehicle.mileage || 0).toLocaleString()} km`,
    fuel: dbVehicle.fuel_type,
    transmission: dbVehicle.transmission,
    maintenance: 'N/A', // Could be linked to maintenance log in future
    imageAlt: `${dbVehicle.brand} ${dbVehicle.model}`,
    imageUrl: dbVehicle.image_url,
    statusColor: getStatusColor(dbVehicle.status),
    isDb: true,
    rawData: dbVehicle // Store raw data for editing
  });

  const handleVehicleSaved = (savedVehicle) => {
    fetchVehicles(); // Refresh list from DB to ensure sync
  };

  const handleEditClick = (vehicle) => {
    setVehicleToEdit(vehicle);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (vehicle) => {
    setVehicleToDelete(vehicle);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleToDelete.id);
      
      if (error) throw error;

      await historyService.logEvent({
        type: 'vehicle_deleted',
        title: `Véhicule supprimé: ${vehicleToDelete.name}`,
        description: `Le véhicule ${vehicleToDelete.name} (${vehicleToDelete.plate}) a été retiré de la flotte.`,
        vehicleId: vehicleToDelete.id,
        metadata: {
            name: vehicleToDelete.name,
            plate: vehicleToDelete.plate
        }
      });

      setVehicles(prev => prev.filter(v => v.id !== vehicleToDelete.id));

      toast({
        title: "Véhicule supprimé",
        description: "Le véhicule a été supprimé avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });

    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer ce véhicule.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  };

  const handleAction = (action, vehicle) => {
    if (action === 'Louer') {
      setSelectedVehicle(vehicle);
      setCheckModalType('checkout');
      setIsCheckModalOpen(true);
    } else if (action === 'Retourner') {
      setSelectedVehicle(vehicle);
      setCheckModalType('checkin');
      setIsCheckModalOpen(true);
    } else if (action === 'Détails') {
      toast({
        title: `Détails: ${vehicle.name}`,
        description: `Consultation des détails pour ${vehicle.plate}`,
      });
    }
  };

  const handleCheckModalConfirm = async (data) => {
    const { vehicleId, type, finalMileage, observations, damages, clientId, clientName, departureTime } = data;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) return;

    const newStatus = type === 'checkout' ? 'LOUÉ' : 'DISPONIBLE';
    const newStatusColor = getStatusColor(newStatus);

    // Optimistic UI Update
    setVehicles(prevVehicles => prevVehicles.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          status: newStatus,
          statusColor: newStatusColor,
          mileage: `${finalMileage.toLocaleString()} km`
        };
      }
      return v;
    }));

    try {
      // 1. Update Vehicle Status in DB
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: newStatus, 
          mileage: finalMileage 
        })
        .eq('id', vehicleId);

      if (vehicleError) throw vehicleError;

      // 2. Handle specific logic for Checkout (Reservation Creation)
      if (type === 'checkout' && clientId) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const startDateTimeStr = `${todayStr}T${departureTime || '09:00'}:00`;
        const startDateTime = new Date(startDateTimeStr);
        const endDateTime = new Date(startDateTime);
        endDateTime.setDate(endDateTime.getDate() + 1);

        const dailyRate = Number(vehicle.rawData?.daily_rate) || 0;
        const estimatedPrice = dailyRate; 

        const { error: resError } = await supabase
          .from('reservations')
          .insert({
            vehicle_id: vehicleId,
            client_id: clientId,
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(), 
            status: 'confirmed', 
            total_price: estimatedPrice,
            notes: observations || 'Départ immédiat via module Véhicules'
          });

        if (resError) {
          console.error("Error creating reservation:", resError);
          toast({
            title: "Attention",
            description: "Véhicule mis à jour, mais la création de la réservation a échoué.",
            variant: "warning"
          });
        }
      }

      const logDescription = type === 'checkout' 
        ? `Départ client: ${clientName} à ${departureTime}. Kilométrage: ${finalMileage} km.${observations ? ` Notes: ${observations}` : ''}`
        : `Retour du véhicule. Kilométrage: ${finalMileage} km.${observations ? ` Notes: ${observations}` : ''}`;

      const logData = {
        type: type === 'checkout' ? 'vehicle_checked_out' : 'vehicle_checked_in',
        title: type === 'checkout' ? `Départ du véhicule: ${vehicle.name}` : `Retour du véhicule: ${vehicle.name}`,
        description: logDescription,
        vehicleId: vehicle.id,
        clientId: clientId || null,
        metadata: {
          vehicle_name: vehicle.name,
          plate: vehicle.plate,
          mileage: finalMileage,
          client_name: clientName,
          time: departureTime
        }
      };
      await historyService.logEvent(logData);

      if (damages && damages.length > 0) {
        for (const damage of damages) {
          await historyService.logEvent({
            type: 'damage_reported',
            title: `Dégât signalé: ${damage.type} sur ${vehicle.name}`,
            description: damage.description,
            vehicleId: vehicle.id,
            metadata: {
              vehicle_name: vehicle.name,
              damage_type: damage.type,
              coordinates: { x: damage.x, y: damage.y }
            }
          });
        }
      }

      toast({
        title: type === 'checkout' ? 'Départ Validé' : 'Retour Validé',
        description: `Le statut du véhicule a été mis à jour et l'historique enregistré.`,
        className: "bg-green-50 border-green-200 text-green-900",
      });

    } catch (error) {
      console.error('Error updating vehicle/history:', error);
      toast({
          title: "Erreur de sauvegarde",
          description: "Une erreur est survenue lors de la sauvegarde.",
          variant: "destructive"
      });
      fetchVehicles(); // Revert/Refresh on error
    }
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestion de la Flotte</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Gérez vos véhicules et leur disponibilité</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un véhicule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-900"
            />
          </div>
          <Button 
            onClick={() => {
              setVehicleToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500 font-medium">Chargement de la flotte...</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 border-dashed">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Aucun véhicule trouvé</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md text-center">
            {searchTerm 
              ? "Aucun véhicule ne correspond à votre recherche." 
              : "Votre flotte est vide. Ajoutez votre premier véhicule pour commencer."}
          </p>
          {searchTerm && (
            <Button variant="outline" className="mt-4" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredVehicles.map((vehicle, index) => {
            const isRented = vehicle.status === 'LOUÉ' || vehicle.status === 'PRÊTÉ';
            
            return (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={cn(
                "rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group relative",
                isRented ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200"
              )}
            >
              {/* Edit/Delete Actions - Positioned on image */}
              {!isRented && (
                <div className="absolute top-4 left-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button 
                    size="icon" 
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 hover:bg-white text-blue-600 shadow-sm"
                    onClick={() => handleEditClick(vehicle)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 hover:bg-white text-red-600 shadow-sm"
                    onClick={() => handleDeleteClick(vehicle)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* New Management Dropdown */}
              <div className="absolute top-4 right-4 z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm rounded-full">
                       <MoreHorizontal className="h-4 w-4 text-gray-700" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Gestion Véhicule</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSelectedVehicle(vehicle); setIsLoanModalOpen(true); }}>
                       <Key className="mr-2 h-4 w-4" /> Prêt Direction
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>


              {/* Image Section */}
              <div className={cn(
                "relative h-56 bg-gray-100 overflow-hidden transition-all duration-200",
                isRented && "opacity-70 grayscale"
              )}>
                <img 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  alt={vehicle.imageAlt}
                  src={vehicle.imageUrl || "https://images.unsplash.com/photo-1685270386774-8d4075c3616f"} />
                <div className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${vehicle.statusColor}`}>
                  {vehicle.status}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
                {/* Info Block - Greyed out if rented */}
                <div className={cn(isRented && "opacity-60")}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">{vehicle.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">{vehicle.year} • {vehicle.plate}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-lg font-bold text-blue-600">{vehicle.price}</span>
                      <span className="text-xs text-gray-400 font-medium">par jour</span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2.5 text-sm text-gray-700 font-medium">
                      <Gauge className="h-4 w-4 text-gray-400" />
                      {vehicle.mileage}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-700 font-medium">
                      <Fuel className="h-4 w-4 text-gray-400" />
                      {vehicle.fuel}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-700 font-medium">
                      <Settings2 className="h-4 w-4 text-gray-400" />
                      {vehicle.transmission}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-700 font-medium">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {vehicle.maintenance}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className={cn(
                        "flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium",
                        isRented && "opacity-40 cursor-not-allowed hover:bg-transparent"
                      )}
                      onClick={() => !isRented && handleAction('Détails', vehicle)}
                      disabled={isRented}
                    >
                      Détails
                    </Button>
                    
                    {vehicle.status === 'DISPONIBLE' ? (
                      <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
                        onClick={() => handleAction('Louer', vehicle)}
                      >
                        Louer
                      </Button>
                    ) : vehicle.status === 'LOUÉ' || vehicle.status === 'PRÊTÉ' ? (
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm animate-pulse hover:animate-none ring-2 ring-green-500/20"
                        onClick={() => handleAction('Retourner', vehicle)}
                      >
                        Retourner
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium shadow-sm cursor-not-allowed opacity-80"
                        disabled
                      >
                        Indisponible
                      </Button>
                    )}
                  </div>

                  {/* History Button - Greyed out if rented */}
                  <div className={cn(isRented && "opacity-40 pointer-events-none")}>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-xs text-gray-400 hover:text-gray-700" disabled={isRented}>
                          <HistoryIcon className="w-3 h-3 mr-2" />
                          Voir l'historique rapide
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Historique du véhicule: {vehicle.name}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 max-h-[60vh] overflow-y-auto">
                          <HistoryTab vehicleId={vehicle.id} />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </motion.div>
          )})}
        </div>
      )}

      {/* Check-in/Check-out Modal */}
      <VehicleCheckModal 
        isOpen={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        type={checkModalType}
        vehicle={selectedVehicle}
        onConfirm={handleCheckModalConfirm}
      />

      {/* Add/Edit Vehicle Modal */}
      <AddVehicleModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onVehicleSaved={handleVehicleSaved}
        vehicleToEdit={vehicleToEdit}
      />

      {/* Loan Modal Only */}
      <AddLoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        vehicle={selectedVehicle}
        onSave={fetchVehicles}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{vehicleToDelete?.name}</strong> ? 
              Cette action est irréversible et supprimera toutes les données associées de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vehicles;