import { supabase } from '@/lib/customSupabaseClient';

const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid && typeof uuid === 'string' && regex.test(uuid);
};

export const historyService = {
  /**
   * Log a new event to the history
   */
  async logEvent({ type, title, description, clientId = null, vehicleId = null, rentalId = null, userId = null, metadata = {} }) {
    try {
      // Validate UUIDs before sending to Supabase
      // If IDs are provided but are not valid UUIDs (e.g. demo data "VEH-001"), 
      // we set them to null for the foreign key columns to avoid DB errors.
      // We preserve the original ID in metadata for reference.
      
      const safeClientId = isValidUUID(clientId) ? clientId : null;
      const safeVehicleId = isValidUUID(vehicleId) ? vehicleId : null;
      const safeRentalId = isValidUUID(rentalId) ? rentalId : null;
      const safeUserId = isValidUUID(userId) ? userId : null;

      // Enrich metadata with original IDs if they were invalid UUIDs
      const enrichedMetadata = { ...metadata };
      if (clientId && !safeClientId) enrichedMetadata.original_client_id = clientId;
      if (vehicleId && !safeVehicleId) enrichedMetadata.original_vehicle_id = vehicleId;
      if (rentalId && !safeRentalId) enrichedMetadata.original_rental_id = rentalId;

      const { data, error } = await supabase
        .from('history_logs')
        .insert([
          {
            type,
            title,
            description,
            client_id: safeClientId,
            vehicle_id: safeVehicleId,
            rental_id: safeRentalId,
            user_id: safeUserId,
            metadata: enrichedMetadata
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'événement:', error);
      return null;
    }
  },

  /**
   * Fetch global history with filters
   */
  async getGlobalHistory({ page = 1, limit = 20, type = null, search = '', startDate = null, endDate = null }) {
    try {
      let query = supabase
        .from('history_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (type && type !== 'all') {
        query = query.eq('type', type);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      return { 
        logs: data || [], 
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique global:', error);
      return { logs: [], total: 0, totalPages: 0 };
    }
  },

  /**
   * Fetch history for a specific client
   */
  async getClientHistory(clientId, { page = 1, limit = 10 } = {}) {
    // If clientId is not a valid UUID (e.g. demo data), return empty immediately
    if (!isValidUUID(clientId)) {
      return { logs: [], total: 0 };
    }

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('history_logs')
        .select('*', { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return { logs: data || [], total: count || 0 };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique client:', error);
      return { logs: [], total: 0 };
    }
  },

  /**
   * Fetch history for a specific vehicle
   */
  async getVehicleHistory(vehicleId, { page = 1, limit = 10 } = {}) {
    // If vehicleId is not a valid UUID (e.g. demo data "VEH-001"), return empty immediately
    if (!isValidUUID(vehicleId)) {
      return { logs: [], total: 0 };
    }

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('history_logs')
        .select('*', { count: 'exact' })
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return { logs: data || [], total: count || 0 };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique véhicule:', error);
      return { logs: [], total: 0 };
    }
  }
};