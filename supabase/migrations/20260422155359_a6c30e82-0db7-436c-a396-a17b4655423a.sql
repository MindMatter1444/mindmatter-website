-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Tighten contact_requests SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view contact requests" ON public.contact_requests;
CREATE POLICY "Admins can view contact requests"
ON public.contact_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Tighten spam_log SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view spam log" ON public.spam_log;
CREATE POLICY "Admins can view spam log"
ON public.spam_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));