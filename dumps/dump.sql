--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: StreamStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StreamStatus" AS ENUM (
    'ONLINE',
    'OFFLINE'
);


ALTER TYPE public."StreamStatus" OWNER TO postgres;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'WARNED',
    'BLOCKED'
);


ALTER TYPE public."UserStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Category" OWNER TO postgres;

--
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Category_id_seq" OWNER TO postgres;

--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- Name: Guild; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Guild" (
    id integer NOT NULL,
    name text NOT NULL,
    "logoFileName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ownerId" integer NOT NULL,
    description text
);


ALTER TABLE public."Guild" OWNER TO postgres;

--
-- Name: Guild_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Guild_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Guild_id_seq" OWNER TO postgres;

--
-- Name: Guild_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Guild_id_seq" OWNED BY public."Guild".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Role_id_seq" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: Stream; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Stream" (
    id integer NOT NULL,
    name text NOT NULL,
    "previewFileName" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "categoryId" integer NOT NULL,
    "userId" integer NOT NULL,
    status public."StreamStatus" DEFAULT 'ONLINE'::public."StreamStatus" NOT NULL
);


ALTER TABLE public."Stream" OWNER TO postgres;

--
-- Name: Stream_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Stream_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Stream_id_seq" OWNER TO postgres;

--
-- Name: Stream_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Stream_id_seq" OWNED BY public."Stream".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    login text,
    password text NOT NULL,
    "roleId" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "refreshToken" text,
    email text NOT NULL,
    "warningCount" integer DEFAULT 0 NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "guildId" integer,
    "terminateCount" integer
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserActivity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserActivity" (
    id integer NOT NULL,
    "userId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "streamId" integer,
    action text NOT NULL,
    details jsonb
);


ALTER TABLE public."UserActivity" OWNER TO postgres;

--
-- Name: UserActivityParticipants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserActivityParticipants" (
    "userId" integer NOT NULL,
    "activityId" integer NOT NULL,
    role text
);


ALTER TABLE public."UserActivityParticipants" OWNER TO postgres;

--
-- Name: UserActivity_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."UserActivity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."UserActivity_id_seq" OWNER TO postgres;

--
-- Name: UserActivity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."UserActivity_id_seq" OWNED BY public."UserActivity".id;


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _UserFollows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_UserFollows" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_UserFollows" OWNER TO postgres;

--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: Guild id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild" ALTER COLUMN id SET DEFAULT nextval('public."Guild_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: Stream id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stream" ALTER COLUMN id SET DEFAULT nextval('public."Stream_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserActivity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity" ALTER COLUMN id SET DEFAULT nextval('public."UserActivity_id_seq"'::regclass);


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name) FROM stdin;
2	Gaming
3	Music
\.


--
-- Data for Name: Guild; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Guild" (id, name, "logoFileName", "createdAt", "updatedAt", "ownerId", description) FROM stdin;
3	Gremlin	1752842306822-214435515.jpg	2025-07-18 12:38:26.832	2025-07-18 12:38:26.832	4	Best guild from the world
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name) FROM stdin;
1	user
2	admin
\.


--
-- Data for Name: Stream; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Stream" (id, name, "previewFileName", "startedAt", "endedAt", "categoryId", "userId", status) FROM stdin;
1	World Of Tanks skoof stream	\N	2025-07-16 08:05:46.909	\N	2	2	ONLINE
2	CS 2 Faceit stream	1752664775927-455729908.png	2025-07-16 11:19:35.938	2025-07-21 07:14:53.339	2	2	ONLINE
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, login, password, "roleId", "createdAt", "updatedAt", "refreshToken", email, "warningCount", status, "guildId", "terminateCount") FROM stdin;
3	fedulova103@gmail.com	$2b$10$zUVYO3NKFZvDrZLQHPrhze43xH8pOIr0OVhM.8gaGeSb8iVJUtvSG	1	2025-07-16 16:06:19.36	2025-07-16 16:06:19.371	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImxvZ2luIjoiZmVkdWxvdmExMDNAZ21haWwuY29tIiwiaWF0IjoxNzUyNjgxOTc5LCJleHAiOjE3NTMyODY3Nzl9.irH8vsRVslYvfrQztFzb3MZvHH9XSwzmSL90-6098Qo	fedulova103@gmail.com	0	ACTIVE	\N	\N
4	\N	$2b$10$Ei6C.kIMBUnSKxU8azqCpObFdBL/v80ZzN/wKFInVw09tEWcG/PtG	2	2025-07-18 07:27:52.31	2025-07-21 07:14:53.348	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQsImxvZ2luIjpudWxsLCJpYXQiOjE3NTMwODE5MzksImV4cCI6MTc1MzY4NjczOX0.CaKixeKS_7QXiiYo4Y8nW1bo70qYrU2UwtzZr8FRthk	test@test.com	0	ACTIVE	\N	1
5	\N	$2b$10$61PIYTgR9PX0dxwoD3uNNOhPRag9N/34RmNXPflvNy2jywLQrXNYy	1	2025-07-18 07:34:46.875	2025-07-18 07:35:41.557	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjUsImxvZ2luIjpudWxsLCJpYXQiOjE3NTI4MjQxNDEsImV4cCI6MTc1MzQyODk0MX0.asNu6Vv_GIeqK15eLC4Gk-zB1sG_nuLiVDwQd3czTOY	egor@mail.com	0	ACTIVE	\N	\N
2	vitalysadikov9@gmail.com	$2b$10$UhBmAvAmsEMrIwYcGFPgsu2QCFeNfdi5yKQqdWNlH6pVeUo3Pqdt2	1	2025-07-16 08:05:46.909	2025-07-18 10:03:39.3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImxvZ2luIjoidml0YWx5c2FkaWtvdjlAZ21haWwuY29tIiwiaWF0IjoxNzUyNjUzMTQ2LCJleHAiOjE3NTMyNTc5NDZ9.dwryJDX4G1dhU0GKgnYSwHZtBfyUIpk4EnxZoz2HHsE	vitalysadikov9@gmail.com	2	WARNED	\N	\N
\.


--
-- Data for Name: UserActivity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivity" (id, "userId", "createdAt", "streamId", action, details) FROM stdin;
1	\N	2025-07-18 10:03:39.305	\N	Admin test@test.com issued a warning to user vitalysadikov9@gmail.com	\N
\.


--
-- Data for Name: UserActivityParticipants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivityParticipants" ("userId", "activityId", role) FROM stdin;
4	1	initiator
2	1	target
\.


--
-- Data for Name: _UserFollows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_UserFollows" ("A", "B") FROM stdin;
\.


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Category_id_seq"', 3, true);


--
-- Name: Guild_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Guild_id_seq"', 3, true);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 2, true);


--
-- Name: Stream_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Stream_id_seq"', 2, true);


--
-- Name: UserActivity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."UserActivity_id_seq"', 1, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 5, true);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Guild Guild_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild"
    ADD CONSTRAINT "Guild_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Stream Stream_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stream"
    ADD CONSTRAINT "Stream_pkey" PRIMARY KEY (id);


--
-- Name: UserActivityParticipants UserActivityParticipants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivityParticipants"
    ADD CONSTRAINT "UserActivityParticipants_pkey" PRIMARY KEY ("userId", "activityId");


--
-- Name: UserActivity UserActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _UserFollows _UserFollows_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserFollows"
    ADD CONSTRAINT "_UserFollows_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);


--
-- Name: Guild_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Guild_name_key" ON public."Guild" USING btree (name);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_login_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_login_key" ON public."User" USING btree (login);


--
-- Name: _UserFollows_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_UserFollows_B_index" ON public."_UserFollows" USING btree ("B");


--
-- Name: Stream Stream_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stream"
    ADD CONSTRAINT "Stream_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Stream Stream_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stream"
    ADD CONSTRAINT "Stream_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserActivityParticipants UserActivityParticipants_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivityParticipants"
    ADD CONSTRAINT "UserActivityParticipants_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public."UserActivity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserActivityParticipants UserActivityParticipants_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivityParticipants"
    ADD CONSTRAINT "UserActivityParticipants_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserActivity UserActivity_streamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES public."Stream"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserActivity UserActivity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public."Guild"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: _UserFollows _UserFollows_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserFollows"
    ADD CONSTRAINT "_UserFollows_A_fkey" FOREIGN KEY ("A") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserFollows _UserFollows_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserFollows"
    ADD CONSTRAINT "_UserFollows_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

