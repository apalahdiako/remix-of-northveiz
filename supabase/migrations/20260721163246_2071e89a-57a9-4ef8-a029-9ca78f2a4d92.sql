
DROP POLICY IF EXISTS "Anyone can read own session messages" ON public.chat_messages;
CREATE POLICY "Admins read all chat, users read none by default"
ON public.chat_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
