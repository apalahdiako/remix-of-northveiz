
CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title text NOT NULL,
  cover_url text,
  status text NOT NULL DEFAULT 'live',
  viewer_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT ON public.live_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_read" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "ls_ins" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());
CREATE POLICY "ls_upd" ON public.live_streams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ls_del" ON public.live_streams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.live_stream_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  is_flash boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, product_id)
);
GRANT SELECT ON public.live_stream_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_stream_products TO authenticated;
GRANT ALL ON public.live_stream_products TO service_role;
ALTER TABLE public.live_stream_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lsp_read" ON public.live_stream_products FOR SELECT USING (true);
CREATE POLICY "lsp_write" ON public.live_stream_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.live_stream_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid,
  display_name text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_stream_messages TO anon;
GRANT SELECT, INSERT, DELETE ON public.live_stream_messages TO authenticated;
GRANT ALL ON public.live_stream_messages TO service_role;
ALTER TABLE public.live_stream_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lsm_read" ON public.live_stream_messages FOR SELECT USING (true);
CREATE POLICY "lsm_ins" ON public.live_stream_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lsm_del" ON public.live_stream_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.live_stream_likes (
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, user_id)
);
GRANT SELECT ON public.live_stream_likes TO anon;
GRANT SELECT, INSERT ON public.live_stream_likes TO authenticated;
GRANT ALL ON public.live_stream_likes TO service_role;
ALTER TABLE public.live_stream_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lsl_read" ON public.live_stream_likes FOR SELECT USING (true);
CREATE POLICY "lsl_ins" ON public.live_stream_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.increment_live_like(p_stream_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.live_stream_likes (stream_id, user_id) VALUES (p_stream_id, v_uid)
  ON CONFLICT DO NOTHING;
  UPDATE public.live_streams SET like_count = like_count + 1 WHERE id = p_stream_id RETURNING like_count INTO v_count;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.set_live_viewer_count(p_stream_id uuid, p_count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.live_streams SET viewer_count = GREATEST(p_count, 0) WHERE id = p_stream_id;
END; $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_likes;
