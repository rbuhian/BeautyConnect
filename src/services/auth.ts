import { supabase } from './supabase';
import { User, ProfessionalProfile } from '../types';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse<T = void> {
  data: T | null;
  error: AuthError | null;
}

// Sign in with phone - sends OTP
export async function signInWithPhone(phone: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to send OTP. Please try again.' } };
  }
}

// Helper function to migrate seed data
async function migrateSeedDataToNewUser(newUserId: string, phone: string): Promise<boolean> {
  try {
    // Check if seed data exists for this phone number
    const { data: seedUser, error: seedError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .neq('id', newUserId)
      .single();

    if (seedError || !seedUser) {
      // No seed data found, this is a genuinely new user
      return false;
    }

    console.log('Found seed data for', phone, '- migrating to new user ID', newUserId);

    // Create or update user record with seed data
    // Use upsert in case a basic user record was already created
    const { error: userUpsertError } = await supabase
      .from('users')
      .upsert({
        id: newUserId,
        phone: phone,
        name: seedUser.name,
        avatar: seedUser.avatar,
        role: seedUser.role,
      }, {
        onConflict: 'id'
      });

    if (userUpsertError) {
      console.error('Error upserting user:', userUpsertError);
      return false;
    }

    // If professional, copy professional data
    if (seedUser.role === 'professional') {
      // Get professional profile
      const { data: seedProfile } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('user_id', seedUser.id)
        .single();

      if (seedProfile) {
        const oldProfileId = seedProfile.id;

        // Check if professional profile already exists
        const { data: existingProfile } = await supabase
          .from('professional_profiles')
          .select('id')
          .eq('user_id', newUserId)
          .single();

        // If profile exists, check if migration was already completed (has services)
        if (existingProfile) {
          const { data: existingServices } = await supabase
            .from('services')
            .select('id')
            .eq('professional_id', existingProfile.id);

          if (existingServices && existingServices.length > 0) {
            console.log('Professional data already migrated, skipping');
            return true;
          }
        }

        let newProfileId: string;

        if (existingProfile) {
          // Update existing profile
          const { data: updatedProfile, error: updateError } = await supabase
            .from('professional_profiles')
            .update({
              bio: seedProfile.bio,
              categories: seedProfile.categories,
              portfolio_photos: seedProfile.portfolio_photos,
              service_area: seedProfile.service_area,
              location_type: seedProfile.location_type,
              salon_address: seedProfile.salon_address,
              is_live: seedProfile.is_live,
              avg_rating: seedProfile.avg_rating,
              total_reviews: seedProfile.total_reviews,
            })
            .eq('user_id', newUserId)
            .select()
            .single();

          if (updateError || !updatedProfile) {
            console.error('Failed to update professional profile:', updateError);
            return false;
          }

          newProfileId = updatedProfile.id;
          console.log('Updated existing professional profile:', newProfileId);
        } else {
          // Create new profile
          const { data: newProfile, error: insertError } = await supabase
            .from('professional_profiles')
            .insert({
              user_id: newUserId,
              bio: seedProfile.bio,
              categories: seedProfile.categories,
              portfolio_photos: seedProfile.portfolio_photos,
              service_area: seedProfile.service_area,
              location_type: seedProfile.location_type,
              salon_address: seedProfile.salon_address,
              is_live: seedProfile.is_live,
              avg_rating: seedProfile.avg_rating,
              total_reviews: seedProfile.total_reviews,
            })
            .select()
            .single();

          if (insertError || !newProfile) {
            console.error('Failed to create professional profile:', insertError);
            return false;
          }

          newProfileId = newProfile.id;
          console.log('Created new professional profile:', newProfileId);
        }

        // Copy services and track old->new ID mapping
        const { data: seedServices } = await supabase
          .from('services')
          .select('*')
          .eq('professional_id', oldProfileId);

        const serviceIdMap: Record<string, string> = {};

        if (seedServices && seedServices.length > 0) {
          for (const service of seedServices) {
            const { data: newService } = await supabase
              .from('services')
              .insert({
                professional_id: newProfileId,
                name: service.name,
                category: service.category,
                duration_minutes: service.duration_minutes,
                price: service.price,
                booking_type: service.booking_type,
                is_active: service.is_active,
              })
              .select()
              .single();

            if (newService) {
              serviceIdMap[service.id] = newService.id;
            }
          }
          console.log('Copied', seedServices.length, 'services');
        }

        // Copy availability
        const { data: seedAvailability } = await supabase
          .from('availability')
          .select('*')
          .eq('professional_id', oldProfileId);

        if (seedAvailability && seedAvailability.length > 0) {
          const newAvailability = seedAvailability.map(avail => ({
            professional_id: newProfileId,
            day_of_week: avail.day_of_week,
            start_time: avail.start_time,
            end_time: avail.end_time,
            is_available: avail.is_available,
          }));
          await supabase.from('availability').insert(newAvailability);
          console.log('Copied', newAvailability.length, 'availability slots');
        }

        // Copy bookings and track old->new ID mapping
        const { data: seedBookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('professional_id', oldProfileId);

        const bookingIdMap: Record<string, string> = {};

        if (seedBookings && seedBookings.length > 0) {
          for (const booking of seedBookings) {
            // Map the service_id to the new service ID
            const mappedServiceId = serviceIdMap[booking.service_id] || booking.service_id;

            const { data: newBooking } = await supabase
              .from('bookings')
              .insert({
                client_id: booking.client_id,
                professional_id: newProfileId,
                service_id: mappedServiceId,
                date: booking.date,
                time_slot: booking.time_slot,
                location_type: booking.location_type,
                client_address: booking.client_address,
                status: booking.status,
                deposit_paid: booking.deposit_paid,
                deposit_amount: booking.deposit_amount,
                total_price: booking.total_price,
                cancelled_at: booking.cancelled_at,
                cancelled_by: booking.cancelled_by,
              })
              .select()
              .single();

            if (newBooking) {
              bookingIdMap[booking.id] = newBooking.id;
            }
          }
          console.log('Copied', seedBookings.length, 'bookings');
        }

        // Copy messages with updated booking_id references
        const oldBookingIds = Object.keys(bookingIdMap);
        if (oldBookingIds.length > 0) {
          const { data: seedMessages } = await supabase
            .from('messages')
            .select('*')
            .in('booking_id', oldBookingIds);

          if (seedMessages && seedMessages.length > 0) {
            const newMessages = seedMessages.map(message => ({
              booking_id: bookingIdMap[message.booking_id],
              sender_id: message.sender_id === seedUser.id ? newUserId : message.sender_id,
              text: message.text,
              created_at: message.created_at,
              read_at: message.read_at,
            }));
            await supabase.from('messages').insert(newMessages);
            console.log('Copied', newMessages.length, 'messages');
          }

          // Copy reviews with updated booking_id and user references
          const { data: seedReviews } = await supabase
            .from('reviews')
            .select('*')
            .in('booking_id', oldBookingIds);

          if (seedReviews && seedReviews.length > 0) {
            const newReviews = seedReviews.map(review => ({
              booking_id: bookingIdMap[review.booking_id],
              reviewer_id: review.reviewer_id,
              reviewee_id: review.reviewee_id === seedUser.id ? newUserId : review.reviewee_id,
              rating: review.rating,
              text: review.text,
              service_name: review.service_name,
              created_at: review.created_at,
            }));
            await supabase.from('reviews').insert(newReviews);
            console.log('Copied', newReviews.length, 'reviews');
          }
        }

        // Copy favorites
        const { data: seedFavorites } = await supabase
          .from('favorites')
          .select('*')
          .eq('professional_id', oldProfileId);

        if (seedFavorites && seedFavorites.length > 0) {
          const newFavorites = seedFavorites.map(fav => ({
            user_id: fav.user_id,
            professional_id: newProfileId,
          }));
          await supabase.from('favorites').insert(newFavorites);
          console.log('Copied', newFavorites.length, 'favorites');
        }

        // Copy business and staff members (if this is a salon/spa/studio)
        const { data: seedBusiness } = await supabase
          .from('businesses')
          .select('*')
          .eq('professional_id', oldProfileId)
          .single();

        if (seedBusiness) {
          // Update business to point to new professional profile using RPC to bypass RLS
          const { data: migrationSuccess, error: businessUpdateError } = await supabase
            .rpc('migrate_business_professional_id', {
              p_business_id: seedBusiness.id,
              p_old_professional_id: oldProfileId,
              p_new_professional_id: newProfileId,
            });

          if (businessUpdateError) {
            console.error('Error migrating business professional_id:', businessUpdateError);
          } else if (migrationSuccess) {
            console.log('Successfully migrated business to new professional profile');
            console.log('Business:', seedBusiness.business_name, '-> Profile ID:', newProfileId);

            // Staff members are already created in seed data and linked to business by business_id
            // No need to migrate them - they will work automatically
            const { data: seedStaff } = await supabase
              .from('staff_members')
              .select('id, name')
              .eq('business_id', seedBusiness.id);

            if (seedStaff && seedStaff.length > 0) {
              console.log('Business has', seedStaff.length, 'staff members');
            }
          } else {
            console.warn('Business migration returned false - business may have already been migrated');
          }
        }
      }
    }

    // If client, copy client-side data (bookings as client, messages, reviews, favorites)
    if (seedUser.role === 'client') {
      // Check if client data was already migrated
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('client_id', newUserId);

      if (existingBookings && existingBookings.length > 0) {
        console.log('Client data already migrated, skipping');
        return true;
      }

      // Copy bookings where client_id = oldUserId
      const { data: seedBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', seedUser.id);

      const bookingIdMap: Record<string, string> = {};

      if (seedBookings && seedBookings.length > 0) {
        for (const booking of seedBookings) {
          const { data: newBooking } = await supabase
            .from('bookings')
            .insert({
              client_id: newUserId,
              professional_id: booking.professional_id,
              service_id: booking.service_id,
              date: booking.date,
              time_slot: booking.time_slot,
              location_type: booking.location_type,
              client_address: booking.client_address,
              status: booking.status,
              deposit_paid: booking.deposit_paid,
              deposit_amount: booking.deposit_amount,
              total_price: booking.total_price,
              cancelled_at: booking.cancelled_at,
              cancelled_by: booking.cancelled_by === seedUser.id ? newUserId : booking.cancelled_by,
            })
            .select()
            .single();

          if (newBooking) {
            bookingIdMap[booking.id] = newBooking.id;
          }
        }
        console.log('Copied', seedBookings.length, 'client bookings');
      }

      // Copy messages with updated booking_id references
      const oldBookingIds = Object.keys(bookingIdMap);
      if (oldBookingIds.length > 0) {
        const { data: seedMessages } = await supabase
          .from('messages')
          .select('*')
          .in('booking_id', oldBookingIds);

        if (seedMessages && seedMessages.length > 0) {
          const newMessages = seedMessages.map(message => ({
            booking_id: bookingIdMap[message.booking_id],
            sender_id: message.sender_id === seedUser.id ? newUserId : message.sender_id,
            text: message.text,
            created_at: message.created_at,
            read_at: message.read_at,
          }));
          await supabase.from('messages').insert(newMessages);
          console.log('Copied', newMessages.length, 'client messages');
        }

        // Copy reviews with updated booking_id and user references
        const { data: seedReviews } = await supabase
          .from('reviews')
          .select('*')
          .in('booking_id', oldBookingIds);

        if (seedReviews && seedReviews.length > 0) {
          const newReviews = seedReviews.map(review => ({
            booking_id: bookingIdMap[review.booking_id],
            reviewer_id: review.reviewer_id === seedUser.id ? newUserId : review.reviewer_id,
            reviewee_id: review.reviewee_id,
            rating: review.rating,
            text: review.text,
            service_name: review.service_name,
            created_at: review.created_at,
          }));
          await supabase.from('reviews').insert(newReviews);
          console.log('Copied', newReviews.length, 'client reviews');
        }
      }

      // Copy favorites where user_id = oldUserId
      const { data: seedFavorites } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', seedUser.id);

      if (seedFavorites && seedFavorites.length > 0) {
        const newFavorites = seedFavorites.map(fav => ({
          user_id: newUserId,
          professional_id: fav.professional_id,
        }));
        await supabase.from('favorites').insert(newFavorites);
        console.log('Copied', newFavorites.length, 'client favorites');
      }
    }

    // Delete old seed user record using database function (bypasses RLS)
    // This prevents duplicate phone number entries
    const { error: deleteError } = await supabase
      .rpc('delete_seed_user_by_phone', {
        target_phone: phone,
        keep_user_id: newUserId
      });

    if (deleteError) {
      console.error('Error deleting old seed user:', deleteError);
      // Don't fail the migration, just log the error
    } else {
      console.log('Deleted old seed user for phone:', phone);
    }

    console.log('Seed data migration completed successfully');
    return true;
  } catch (err) {
    console.error('Error migrating seed data:', err);
    return false;
  }
}

// Verify OTP
export async function verifyOtp(
  phone: string,
  token: string
): Promise<AuthResponse<{ isNewUser: boolean }>> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    if (!data.user?.id) {
      return { data: null, error: { message: 'User ID not found after verification' } };
    }

    const authUserId = data.user.id;

    // Always try to migrate seed data if it exists
    // This handles cases where a basic user record may have been created by old triggers
    await migrateSeedDataToNewUser(authUserId, phone);

    // Fetch the user profile (either newly migrated or existing)
    let { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();

    // If no user profile exists, create a basic one for new users
    if (!userProfile) {
      console.log('Creating new user profile for:', phone);
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          phone: phone,
          role: 'client', // Default role, will be updated in role selection
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
      } else {
        userProfile = newUser;
      }
    }

    const isNewUser = !userProfile?.name;

    return { data: { isNewUser }, error: null };
  } catch (err) {
    console.error('Error in verifyOtp:', err);
    return { data: null, error: { message: 'Failed to verify OTP. Please try again.' } };
  }
}

// Get current user profile
export async function getCurrentUser(): Promise<AuthResponse<User>> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { data: null, error: null };
    }

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: userProfile as User, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch user profile.' } };
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'avatar' | 'role'>>
): Promise<AuthResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as User, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update profile.' } };
  }
}

// Create professional profile
export async function createProfessionalProfile(
  userId: string
): Promise<AuthResponse<ProfessionalProfile>> {
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .insert({
        user_id: userId,
        bio: '',
        categories: [],
        portfolio_photos: [],
        service_area: '',
        location_type: 'both',
        is_live: false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as ProfessionalProfile, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create professional profile.' } };
  }
}

// Get professional profile (with business and staff if exists)
export async function getProfessionalProfile(
  userId: string
): Promise<AuthResponse<ProfessionalProfile>> {
  try {
    // Fetch professional profile
    const { data: profile, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error: { message: error.message } };
    }

    if (!profile) {
      return { data: null, error: null };
    }

    // Fetch business if exists
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('professional_id', profile.id)
      .single();

    // If business exists, fetch staff members
    let staffMembers = null;
    if (business) {
      const { data: staff } = await supabase
        .from('staff_members')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('name');
      staffMembers = staff;
    }

    return {
      data: {
        ...profile,
        business: business || undefined,
        staff_members: staffMembers || undefined,
      } as ProfessionalProfile,
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professional profile.' } };
  }
}

// Sign out
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to sign out.' } };
  }
}
