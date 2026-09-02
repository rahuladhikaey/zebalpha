import { supabaseA as supabase } from '../lib/supabase.js';
import { HTTP_STATUS, ROLES } from '../constants/index.js';

export const login = async (req, res, next) => {
  try {
    const { email, password, role = ROLES.CUSTOMER } = req.body;
    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data?.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: error?.message || 'Invalid email or password'
      });
    }

    const user = data.user;
    const session = data.session;
    const userRole = user.user_metadata?.role || role;

    // Fetch matching profile or seller data
    let profileData = null;
    if (userRole === ROLES.SELLER) {
      const { data: seller } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      profileData = seller;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profileData = profile;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      user,
      profile: profileData,
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
      expiresAt: session?.expires_at,
    });
  } catch (err) {
    next(err);
  }
};

export const register = async (req, res, next) => {
  try {
    const { email, password, fullName, phone, role = ROLES.CUSTOMER } = req.body;
    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role,
        },
      },
    });

    if (error || !data?.user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: error?.message || 'Registration failed'
      });
    }

    const user = data.user;
    const session = data.session;

    // Upsert into public.profiles for customers
    if (role === ROLES.CUSTOMER && user?.id) {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: normalizedEmail,
        full_name: fullName || 'Customer',
        phone_no: phone || null,
        role: 'customer',
        status: 'active',
        updated_at: new Date().toISOString(),
      });
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      user,
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Refresh token required' });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    });
  } catch (err) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Invalid refresh token' });
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'User session not found or expired' });
    }

    const role = user.user_metadata?.role || ROLES.CUSTOMER;

    let profile = null;
    if (role === ROLES.SELLER) {
      const { data: seller } = await supabase.from('sellers').select('*').eq('user_id', user.id).maybeSingle();
      profile = seller;
    } else {
      const { data: custProf } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      profile = custProf;
    }

    res.status(HTTP_STATUS.OK).json({ success: true, user, profile });
  } catch (err) {
    next(err);
  }
};
