--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ActFormat; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActFormat" AS ENUM (
    'SINGLE',
    'SEVERAL'
);


ALTER TYPE public."ActFormat" OWNER TO postgres;

--
-- Name: ActStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActStatus" AS ENUM (
    'ONLINE',
    'OFFLINE'
);


ALTER TYPE public."ActStatus" OWNER TO postgres;

--
-- Name: ActType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActType" AS ENUM (
    'SINGLE',
    'MULTI'
);


ALTER TYPE public."ActType" OWNER TO postgres;

--
-- Name: SelectionMethods; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SelectionMethods" AS ENUM (
    'VOTING',
    'BIDDING',
    'MANUAL'
);


ALTER TYPE public."SelectionMethods" OWNER TO postgres;

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
-- Name: Achievement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Achievement" (
    id integer NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "imageUrl" text
);


ALTER TABLE public."Achievement" OWNER TO postgres;

--
-- Name: Achievement_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Achievement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Achievement_id_seq" OWNER TO postgres;

--
-- Name: Achievement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Achievement_id_seq" OWNED BY public."Achievement".id;


--
-- Name: Act; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Act" (
    id integer NOT NULL,
    title text NOT NULL,
    "previewFileName" text,
    "sequelId" integer,
    type public."ActType" DEFAULT 'SINGLE'::public."ActType" NOT NULL,
    format public."ActFormat" DEFAULT 'SINGLE'::public."ActFormat" NOT NULL,
    "heroMethods" public."SelectionMethods" DEFAULT 'VOTING'::public."SelectionMethods" NOT NULL,
    "navigatorMethods" public."SelectionMethods" DEFAULT 'VOTING'::public."SelectionMethods" NOT NULL,
    "introId" integer,
    "outroId" integer,
    status public."ActStatus" DEFAULT 'ONLINE'::public."ActStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "categoryId" integer,
    "userId" integer NOT NULL,
    "recordingResourceId" text,
    "recordingSid" text,
    "recordingStatus" text,
    "recordingUrl" text,
    "destinationLatitude" double precision,
    "destinationLongitude" double precision,
    "startLatitude" double precision,
    "startLongitude" double precision,
    likes integer DEFAULT 0 NOT NULL,
    "effectId" integer,
    "spotAgentCount" integer DEFAULT 0 NOT NULL,
    "spotAgentMethods" public."SelectionMethods" DEFAULT 'VOTING'::public."SelectionMethods" NOT NULL,
    "biddingTime" timestamp(3) without time zone,
    description text,
    tags text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public."Act" OWNER TO postgres;

--
-- Name: ActMusic; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActMusic" (
    "actId" integer NOT NULL,
    "musicId" integer NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ActMusic" OWNER TO postgres;

--
-- Name: ActParticipant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActParticipant" (
    id integer NOT NULL,
    "actId" integer NOT NULL,
    "userId" integer NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'applied'::text NOT NULL,
    "joinedAt" timestamp(3) without time zone,
    "leftAt" timestamp(3) without time zone
);


ALTER TABLE public."ActParticipant" OWNER TO postgres;

--
-- Name: ActParticipant_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActParticipant_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActParticipant_id_seq" OWNER TO postgres;

--
-- Name: ActParticipant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActParticipant_id_seq" OWNED BY public."ActParticipant".id;


--
-- Name: ActSpotAgent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActSpotAgent" (
    id integer NOT NULL,
    "actId" integer NOT NULL,
    "userId" integer NOT NULL,
    task text,
    status text DEFAULT 'pending'::text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."ActSpotAgent" OWNER TO postgres;

--
-- Name: ActSpotAgentCandidate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActSpotAgentCandidate" (
    id integer NOT NULL,
    "actId" integer NOT NULL,
    "userId" integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "appliedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActSpotAgentCandidate" OWNER TO postgres;

--
-- Name: ActSpotAgentCandidate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActSpotAgentCandidate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActSpotAgentCandidate_id_seq" OWNER TO postgres;

--
-- Name: ActSpotAgentCandidate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActSpotAgentCandidate_id_seq" OWNED BY public."ActSpotAgentCandidate".id;


--
-- Name: ActSpotAgentVote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActSpotAgentVote" (
    id integer NOT NULL,
    "candidateId" integer NOT NULL,
    "voterId" integer NOT NULL,
    "votedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActSpotAgentVote" OWNER TO postgres;

--
-- Name: ActSpotAgentVote_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActSpotAgentVote_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActSpotAgentVote_id_seq" OWNER TO postgres;

--
-- Name: ActSpotAgentVote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActSpotAgentVote_id_seq" OWNED BY public."ActSpotAgentVote".id;


--
-- Name: ActSpotAgent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActSpotAgent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActSpotAgent_id_seq" OWNER TO postgres;

--
-- Name: ActSpotAgent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActSpotAgent_id_seq" OWNED BY public."ActSpotAgent".id;


--
-- Name: ActTask; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActTask" (
    id integer NOT NULL,
    title text NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "actId" integer NOT NULL
);


ALTER TABLE public."ActTask" OWNER TO postgres;

--
-- Name: ActTask_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActTask_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActTask_id_seq" OWNER TO postgres;

--
-- Name: ActTask_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActTask_id_seq" OWNED BY public."ActTask".id;


--
-- Name: ActTeam; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActTeam" (
    id integer NOT NULL,
    "actId" integer NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActTeam" OWNER TO postgres;

--
-- Name: ActTeamCandidate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActTeamCandidate" (
    id integer NOT NULL,
    "configId" integer NOT NULL,
    "userId" integer NOT NULL
);


ALTER TABLE public."ActTeamCandidate" OWNER TO postgres;

--
-- Name: ActTeamCandidate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActTeamCandidate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActTeamCandidate_id_seq" OWNER TO postgres;

--
-- Name: ActTeamCandidate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActTeamCandidate_id_seq" OWNED BY public."ActTeamCandidate".id;


--
-- Name: ActTeamRoleConfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActTeamRoleConfig" (
    id integer NOT NULL,
    "teamId" integer NOT NULL,
    role text NOT NULL,
    "openVoting" boolean DEFAULT false NOT NULL,
    "votingStartAt" timestamp(3) without time zone,
    "votingDurationHours" integer
);


ALTER TABLE public."ActTeamRoleConfig" OWNER TO postgres;

--
-- Name: ActTeamRoleConfig_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActTeamRoleConfig_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActTeamRoleConfig_id_seq" OWNER TO postgres;

--
-- Name: ActTeamRoleConfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActTeamRoleConfig_id_seq" OWNED BY public."ActTeamRoleConfig".id;


--
-- Name: ActTeamTask; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActTeamTask" (
    id integer NOT NULL,
    "teamId" integer NOT NULL,
    "imageUrl" text,
    description text NOT NULL,
    address text,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActTeamTask" OWNER TO postgres;

--
-- Name: ActTeamTask_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActTeamTask_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActTeamTask_id_seq" OWNER TO postgres;

--
-- Name: ActTeamTask_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActTeamTask_id_seq" OWNED BY public."ActTeamTask".id;


--
-- Name: ActTeam_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActTeam_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActTeam_id_seq" OWNER TO postgres;

--
-- Name: ActTeam_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActTeam_id_seq" OWNED BY public."ActTeam".id;


--
-- Name: Act_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Act_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Act_id_seq" OWNER TO postgres;

--
-- Name: Act_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Act_id_seq" OWNED BY public."Act".id;


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


ALTER SEQUENCE public."Category_id_seq" OWNER TO postgres;

--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- Name: Chat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Chat" (
    id integer NOT NULL,
    type text DEFAULT 'direct'::text NOT NULL,
    name text,
    "imageUrl" text,
    "guildId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "inviteCode" text
);


ALTER TABLE public."Chat" OWNER TO postgres;

--
-- Name: ChatMember; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatMember" (
    id integer NOT NULL,
    "chatId" integer NOT NULL,
    "userId" integer NOT NULL,
    "lastReadAt" timestamp(3) without time zone,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ChatMember" OWNER TO postgres;

--
-- Name: ChatMember_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ChatMember_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ChatMember_id_seq" OWNER TO postgres;

--
-- Name: ChatMember_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ChatMember_id_seq" OWNED BY public."ChatMember".id;


--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatMessage" (
    id integer NOT NULL,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" integer NOT NULL,
    "actId" integer NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO postgres;

--
-- Name: ChatMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ChatMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ChatMessage_id_seq" OWNER TO postgres;

--
-- Name: ChatMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ChatMessage_id_seq" OWNED BY public."ChatMessage".id;


--
-- Name: Chat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Chat_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Chat_id_seq" OWNER TO postgres;

--
-- Name: Chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Chat_id_seq" OWNED BY public."Chat".id;


--
-- Name: Effect; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Effect" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    "userId" integer
);


ALTER TABLE public."Effect" OWNER TO postgres;

--
-- Name: Effect_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Effect_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Effect_id_seq" OWNER TO postgres;

--
-- Name: Effect_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Effect_id_seq" OWNED BY public."Effect".id;


--
-- Name: Guild; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Guild" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "logoFileName" text,
    "ownerId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "coverFileName" text,
    tags text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public."Guild" OWNER TO postgres;

--
-- Name: GuildAchievement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GuildAchievement" (
    "guildId" integer NOT NULL,
    "achievementId" integer NOT NULL,
    "awardedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."GuildAchievement" OWNER TO postgres;

--
-- Name: GuildChatMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GuildChatMessage" (
    id integer NOT NULL,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" integer NOT NULL,
    "guildId" integer NOT NULL
);


ALTER TABLE public."GuildChatMessage" OWNER TO postgres;

--
-- Name: GuildChatMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."GuildChatMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."GuildChatMessage_id_seq" OWNER TO postgres;

--
-- Name: GuildChatMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."GuildChatMessage_id_seq" OWNED BY public."GuildChatMessage".id;


--
-- Name: GuildJoinRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GuildJoinRequest" (
    id integer NOT NULL,
    "guildId" integer NOT NULL,
    "userId" integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    message text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GuildJoinRequest" OWNER TO postgres;

--
-- Name: GuildJoinRequest_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."GuildJoinRequest_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."GuildJoinRequest_id_seq" OWNER TO postgres;

--
-- Name: GuildJoinRequest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."GuildJoinRequest_id_seq" OWNED BY public."GuildJoinRequest".id;


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


ALTER SEQUENCE public."Guild_id_seq" OWNER TO postgres;

--
-- Name: Guild_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Guild_id_seq" OWNED BY public."Guild".id;


--
-- Name: Intro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Intro" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    "userId" integer
);


ALTER TABLE public."Intro" OWNER TO postgres;

--
-- Name: Intro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Intro_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Intro_id_seq" OWNER TO postgres;

--
-- Name: Intro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Intro_id_seq" OWNED BY public."Intro".id;


--
-- Name: Message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Message" (
    id integer NOT NULL,
    "chatId" integer NOT NULL,
    "senderId" integer NOT NULL,
    text text,
    "fileUrl" text,
    "fileType" text,
    "replyToId" integer,
    "forwardedFromId" integer,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Message" OWNER TO postgres;

--
-- Name: Message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Message_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Message_id_seq" OWNER TO postgres;

--
-- Name: Message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Message_id_seq" OWNED BY public."Message".id;


--
-- Name: Music; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Music" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    length text NOT NULL,
    "userId" integer
);


ALTER TABLE public."Music" OWNER TO postgres;

--
-- Name: Music_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Music_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Music_id_seq" OWNER TO postgres;

--
-- Name: Music_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Music_id_seq" OWNED BY public."Music".id;


--
-- Name: Outro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Outro" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    "userId" integer
);


ALTER TABLE public."Outro" OWNER TO postgres;

--
-- Name: Outro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Outro_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Outro_id_seq" OWNER TO postgres;

--
-- Name: Outro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Outro_id_seq" OWNED BY public."Outro".id;


--
-- Name: Poll; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Poll" (
    id integer NOT NULL,
    "actId" integer NOT NULL,
    "creatorId" integer NOT NULL,
    title text NOT NULL,
    description text,
    "endsAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Poll" OWNER TO postgres;

--
-- Name: PollOption; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PollOption" (
    id integer NOT NULL,
    "pollId" integer NOT NULL,
    text text NOT NULL
);


ALTER TABLE public."PollOption" OWNER TO postgres;

--
-- Name: PollOption_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PollOption_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PollOption_id_seq" OWNER TO postgres;

--
-- Name: PollOption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PollOption_id_seq" OWNED BY public."PollOption".id;


--
-- Name: PollVote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PollVote" (
    id integer NOT NULL,
    "pollId" integer NOT NULL,
    "optionId" integer NOT NULL,
    "userId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PollVote" OWNER TO postgres;

--
-- Name: PollVote_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PollVote_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PollVote_id_seq" OWNER TO postgres;

--
-- Name: PollVote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PollVote_id_seq" OWNED BY public."PollVote".id;


--
-- Name: Poll_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Poll_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Poll_id_seq" OWNER TO postgres;

--
-- Name: Poll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Poll_id_seq" OWNED BY public."Poll".id;


--
-- Name: Rank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Rank" (
    id integer NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Rank" OWNER TO postgres;

--
-- Name: Rank_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Rank_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Rank_id_seq" OWNER TO postgres;

--
-- Name: Rank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Rank_id_seq" OWNED BY public."Rank".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: RoleCandidate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoleCandidate" (
    id integer NOT NULL,
    "actId" integer NOT NULL,
    "userId" integer NOT NULL,
    "roleType" text NOT NULL,
    method public."SelectionMethods" NOT NULL,
    "bidAmount" double precision,
    "bidItem" text,
    "appliedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "heroActId" integer,
    "navigatorActId" integer
);


ALTER TABLE public."RoleCandidate" OWNER TO postgres;

--
-- Name: RoleCandidate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."RoleCandidate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RoleCandidate_id_seq" OWNER TO postgres;

--
-- Name: RoleCandidate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."RoleCandidate_id_seq" OWNED BY public."RoleCandidate".id;


--
-- Name: RoleVote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoleVote" (
    id integer NOT NULL,
    "candidateId" integer NOT NULL,
    "voterId" integer NOT NULL,
    "votedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RoleVote" OWNER TO postgres;

--
-- Name: RoleVote_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."RoleVote_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RoleVote_id_seq" OWNER TO postgres;

--
-- Name: RoleVote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."RoleVote_id_seq" OWNED BY public."RoleVote".id;


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


ALTER SEQUENCE public."Role_id_seq" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: RoutePoint; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoutePoint" (
    id integer NOT NULL,
    "actId" integer NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RoutePoint" OWNER TO postgres;

--
-- Name: RoutePoint_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."RoutePoint_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RoutePoint_id_seq" OWNER TO postgres;

--
-- Name: RoutePoint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."RoutePoint_id_seq" OWNED BY public."RoutePoint".id;


--
-- Name: Sequel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sequel" (
    id integer NOT NULL,
    title text NOT NULL,
    episodes integer NOT NULL,
    "coverFileName" text,
    "userId" integer NOT NULL
);


ALTER TABLE public."Sequel" OWNER TO postgres;

--
-- Name: Sequel_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Sequel_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Sequel_id_seq" OWNER TO postgres;

--
-- Name: Sequel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Sequel_id_seq" OWNED BY public."Sequel".id;


--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Ticket" (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    img text,
    "userId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO postgres;

--
-- Name: TicketMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TicketMessage" (
    id integer NOT NULL,
    text text NOT NULL,
    "ticketId" integer NOT NULL,
    "userId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TicketMessage" OWNER TO postgres;

--
-- Name: TicketMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TicketMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TicketMessage_id_seq" OWNER TO postgres;

--
-- Name: TicketMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TicketMessage_id_seq" OWNED BY public."TicketMessage".id;


--
-- Name: Ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Ticket_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Ticket_id_seq" OWNER TO postgres;

--
-- Name: Ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Ticket_id_seq" OWNED BY public."Ticket".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    login text,
    password text NOT NULL,
    email text NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "warningCount" integer DEFAULT 0 NOT NULL,
    "roleId" integer DEFAULT 1 NOT NULL,
    "terminateCount" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "refreshToken" text,
    "guildId" integer,
    "avatarUrl" text,
    "fullName" text,
    "timeZone" text,
    "notifyActProgress" boolean DEFAULT true NOT NULL,
    "notifyActStatusRealtime" boolean DEFAULT true NOT NULL,
    "notifyAll" boolean DEFAULT true NOT NULL,
    "notifyChatMentions" boolean DEFAULT true NOT NULL,
    "notifyGuildInvites" boolean DEFAULT true NOT NULL,
    "communicationLanguages" text[] DEFAULT ARRAY[]::text[],
    city text,
    country text,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "whoCanMessage" text DEFAULT 'all'::text NOT NULL,
    points integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserAchievement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserAchievement" (
    "userId" integer NOT NULL,
    "achievementId" integer NOT NULL,
    "awardedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserAchievement" OWNER TO postgres;

--
-- Name: UserActivity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserActivity" (
    id integer NOT NULL,
    action text NOT NULL,
    details jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" integer,
    "streamId" integer
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


ALTER SEQUENCE public."UserActivity_id_seq" OWNER TO postgres;

--
-- Name: UserActivity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."UserActivity_id_seq" OWNED BY public."UserActivity".id;


--
-- Name: UserRank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserRank" (
    "userId" integer NOT NULL,
    "rankId" integer NOT NULL
);


ALTER TABLE public."UserRank" OWNER TO postgres;

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


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

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
-- Name: Achievement id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achievement" ALTER COLUMN id SET DEFAULT nextval('public."Achievement_id_seq"'::regclass);


--
-- Name: Act id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act" ALTER COLUMN id SET DEFAULT nextval('public."Act_id_seq"'::regclass);


--
-- Name: ActParticipant id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActParticipant" ALTER COLUMN id SET DEFAULT nextval('public."ActParticipant_id_seq"'::regclass);


--
-- Name: ActSpotAgent id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgent" ALTER COLUMN id SET DEFAULT nextval('public."ActSpotAgent_id_seq"'::regclass);


--
-- Name: ActSpotAgentCandidate id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentCandidate" ALTER COLUMN id SET DEFAULT nextval('public."ActSpotAgentCandidate_id_seq"'::regclass);


--
-- Name: ActSpotAgentVote id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentVote" ALTER COLUMN id SET DEFAULT nextval('public."ActSpotAgentVote_id_seq"'::regclass);


--
-- Name: ActTask id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTask" ALTER COLUMN id SET DEFAULT nextval('public."ActTask_id_seq"'::regclass);


--
-- Name: ActTeam id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeam" ALTER COLUMN id SET DEFAULT nextval('public."ActTeam_id_seq"'::regclass);


--
-- Name: ActTeamCandidate id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamCandidate" ALTER COLUMN id SET DEFAULT nextval('public."ActTeamCandidate_id_seq"'::regclass);


--
-- Name: ActTeamRoleConfig id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamRoleConfig" ALTER COLUMN id SET DEFAULT nextval('public."ActTeamRoleConfig_id_seq"'::regclass);


--
-- Name: ActTeamTask id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamTask" ALTER COLUMN id SET DEFAULT nextval('public."ActTeamTask_id_seq"'::regclass);


--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: Chat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat" ALTER COLUMN id SET DEFAULT nextval('public."Chat_id_seq"'::regclass);


--
-- Name: ChatMember id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMember" ALTER COLUMN id SET DEFAULT nextval('public."ChatMember_id_seq"'::regclass);


--
-- Name: ChatMessage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage" ALTER COLUMN id SET DEFAULT nextval('public."ChatMessage_id_seq"'::regclass);


--
-- Name: Effect id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Effect" ALTER COLUMN id SET DEFAULT nextval('public."Effect_id_seq"'::regclass);


--
-- Name: Guild id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild" ALTER COLUMN id SET DEFAULT nextval('public."Guild_id_seq"'::regclass);


--
-- Name: GuildChatMessage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildChatMessage" ALTER COLUMN id SET DEFAULT nextval('public."GuildChatMessage_id_seq"'::regclass);


--
-- Name: GuildJoinRequest id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildJoinRequest" ALTER COLUMN id SET DEFAULT nextval('public."GuildJoinRequest_id_seq"'::regclass);


--
-- Name: Intro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Intro" ALTER COLUMN id SET DEFAULT nextval('public."Intro_id_seq"'::regclass);


--
-- Name: Message id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message" ALTER COLUMN id SET DEFAULT nextval('public."Message_id_seq"'::regclass);


--
-- Name: Music id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Music" ALTER COLUMN id SET DEFAULT nextval('public."Music_id_seq"'::regclass);


--
-- Name: Outro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outro" ALTER COLUMN id SET DEFAULT nextval('public."Outro_id_seq"'::regclass);


--
-- Name: Poll id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Poll" ALTER COLUMN id SET DEFAULT nextval('public."Poll_id_seq"'::regclass);


--
-- Name: PollOption id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollOption" ALTER COLUMN id SET DEFAULT nextval('public."PollOption_id_seq"'::regclass);


--
-- Name: PollVote id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollVote" ALTER COLUMN id SET DEFAULT nextval('public."PollVote_id_seq"'::regclass);


--
-- Name: Rank id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rank" ALTER COLUMN id SET DEFAULT nextval('public."Rank_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: RoleCandidate id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleCandidate" ALTER COLUMN id SET DEFAULT nextval('public."RoleCandidate_id_seq"'::regclass);


--
-- Name: RoleVote id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleVote" ALTER COLUMN id SET DEFAULT nextval('public."RoleVote_id_seq"'::regclass);


--
-- Name: RoutePoint id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoutePoint" ALTER COLUMN id SET DEFAULT nextval('public."RoutePoint_id_seq"'::regclass);


--
-- Name: Sequel id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sequel" ALTER COLUMN id SET DEFAULT nextval('public."Sequel_id_seq"'::regclass);


--
-- Name: Ticket id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket" ALTER COLUMN id SET DEFAULT nextval('public."Ticket_id_seq"'::regclass);


--
-- Name: TicketMessage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage" ALTER COLUMN id SET DEFAULT nextval('public."TicketMessage_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserActivity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity" ALTER COLUMN id SET DEFAULT nextval('public."UserActivity_id_seq"'::regclass);


--
-- Data for Name: Achievement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Achievement" (id, name, "createdAt", "imageUrl") FROM stdin;
1	Набрать 100 просмотров	2025-11-26 12:49:07.856	\N
2	Набрать 500 просмотров	2025-11-26 15:27:21.906	\N
3	Act master	2026-02-28 12:15:40.217	https://s3.twcstorage.ru/db40905a-a32d-43ce-a541-af9428eeecda/1772280936458-c5fa02a9bba44b136980625ed7efc2e7489f20cc.png
\.


--
-- Data for Name: Act; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Act" (id, title, "previewFileName", "sequelId", type, format, "heroMethods", "navigatorMethods", "introId", "outroId", status, "startedAt", "endedAt", "categoryId", "userId", "recordingResourceId", "recordingSid", "recordingStatus", "recordingUrl", "destinationLatitude", "destinationLongitude", "startLatitude", "startLongitude", likes, "effectId", "spotAgentCount", "spotAgentMethods", "biddingTime", description, tags) FROM stdin;
24	апавпапав	/uploads/acts/1771704054788-50599762.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	OFFLINE	2026-02-21 20:00:54.897	2026-02-21 20:01:28.094	\N	1	hxihVkPdE2RrsklnoWVPfPNlV9R6gLAkNrFcodp0TGzl-B0jcgTv2gd1vJQ9TmzwxqyLt-8KAIX2CPciZwe2-7aOvxOlIhoS0rlni9rBgtZQauDfwa0x8RAthA7uRDLhpglest_BHW410ivTGc-an4MLfTSsQtSDR8ODYHGsS7q7c9mvPN5topY8G356mZWG	43f51ee73b4b8e3a5ab00bb5b66022b4	failed	\N	55.74914429386128	37.59964370714443	\N	\N	0	\N	1	VOTING	2026-02-21 20:05:54.693	\N	{}
20	gfgdggfdgf	/uploads/acts/1771601735501-908500336.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	OFFLINE	2026-02-20 15:35:35.619	2026-02-20 15:36:19.183	\N	8	_BDv6sMSOoNBditCLXy8OMGp3iHo_26T4ymZvbVqkUL-CQ_XHsUtHxepUQp0VdFyrSBugDVceJ2khqAnw2i6TnyHWXflrVHNVYsLiY2NgJms5qLjligGKwjdAjKShRxTvH_qv4xdbuNxxPTF8EiDivjl03aFAKOqeOSgjhQiICKH6rZrQYn7venU9mUeo8U0	73b5645f54453275a44009917affcb4d	failed	\N	55.74131777590301	37.63689422594326	\N	\N	0	\N	1	VOTING	2026-02-20 15:40:35.419	\N	{}
25	fgfgfd	/uploads/acts/1771704591660-890934921.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	OFFLINE	2026-02-21 20:09:51.711	2026-02-21 20:10:27.057	\N	1	roAtozmtBkVxSbALApH1q6jEj8MJamTnrF4qyTRuV5g2M5cQkJEeZ18dk87XKdWlahs_eh8Zmr-XKduVpRU0kI1m21tUIranerDX96o5m39xgw1RbwDdFF3CRCuvXKNLUxfd3d0TW8r4IaQTbG6LOazq3TZjuMqjOUHz88-IAscEejs3uHa6fAipLPVhIT_c	6ddb98ca3c47aab8c9b4dca6251a1ab7	failed	\N	55.74759843942743	37.60822677599209	\N	\N	0	\N	1	VOTING	2026-02-21 20:14:51.611	\N	{}
21	gfgfgf	/uploads/acts/1771601895116-731875344.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	OFFLINE	2026-02-20 15:38:15.209	2026-02-20 15:38:47.131	\N	8	2NrOxwNZv1rKBV3784aUbVA2NO888e9B_EUiaMr7Fw9uC2kxjkRCPzACNTfuHnbYBmC4wHM_fq6qMt_9CocdwOYQC9y2EVGPOZALPCXmuPAhQObxxS_jGyuIhCcXgpaD6mtnFzEs58wGT9FoOzVw9kTpR7JTBUAsEk4NKfeY7YSM77vBUuUGhStCve6DLYBE	e4c0c792494b3254ebf7a6828e3666cb	failed	\N	55.75088330688495	37.61354827867763	\N	\N	0	\N	1	VOTING	2026-02-20 15:43:15.004	\N	{}
26	title	/uploads/acts/1771919465806-474854330.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	ONLINE	2026-02-24 07:51:05.833	\N	\N	1	46eyU5df1pp9Z5NVX3787EBAllRCTlaRSwyGV72MghPDPpvOX-Bn-lmDWzhskDW1-_IxgIX9xAHumBvl0sHUkDyCgu0jyXfkHbSBgw8lg3ZzTAUJexQiDMx83l-n2hdAkgE1vSUx54qo9PVNGfpNdX18rxVrB-gZoLryA1Fvj4dhsaLp2FrGwBLJaHW5td5W	35c6bf06a14c64925a311ab01d9b5eae	recording	\N	55.74721196624832	37.59998702989834	\N	\N	0	\N	1	VOTING	2026-02-24 07:56:05.737	\N	{}
22	tgfdgfgfd	/uploads/acts/1771616825855-662215036.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	OFFLINE	2026-02-20 19:47:05.872	2026-02-20 19:47:46.04	\N	1	Ljr56LzivhEPgJ-rJpDxcubDhOUx2DRmdIbFXrD_GFbN-cE2rAYR-dO1bleVsra2DGB3D2EjVYJCGliilr2VHXlAIzZPs0F5P2BaI07KnR2EOKGJ4zxTIW-dCNY0Usowg5LuYo1Qg-UCocbE5j9c58BiTSVcgKPM-OUslxpvFAJc0hNXNr3C-HR8TvewByuV	52ac907a0449887ac1491ab40861fffc	failed	\N	55.74102787471819	37.60239028917568	\N	\N	0	\N	1	VOTING	2026-02-20 19:52:05.809	\N	{}
23	titllee	/uploads/acts/1771703743355-353591108.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	OFFLINE	2026-02-21 19:55:43.45	2026-02-21 19:56:13.62	\N	1	HrA20628gWxFgePtSvC7U6JC479bErXUwdU1ervkE_fa__5a8w88psqJEgz44RE_BPIceT1T_4nQcLlrMwnjlhIoPqrPQTAeTrhcRG3QxmRReHIzgz_3xkS8xd1Teq4RZnHCNkE4P1zL3jfZhyxK1bEFhtARFEbvwdgJiQZH9MLYNqI8S7woEaTJOsguwzK_	20f406f8da4080e49d38fa9c6a386357	failed	\N	55.75803176823725	37.62487792955654	\N	\N	0	\N	1	VOTING	2026-02-21 20:00:43.28	\N	{}
27	title	/uploads/acts/1771919517267-320857045.png	\N	SINGLE	SINGLE	VOTING	VOTING	1	1	OFFLINE	2026-02-24 07:51:57.281	2026-02-24 07:52:30.469	\N	1	wNTCdqyZpKLwysHmhSKDamICnXc6rEWkQPHx-m9nlxgDlFKu_DeoniblQu_Le9n3VSNHi-7dMajT40ZLNPb5TurDirt5rFU1hfj9gMDCTBTNbRWqMfK4uJg4GCJGxZERpNxIsMqrb2xh4rPgu5N-dSRRCKYW2Cgd5EvkcScpZduiWyInXewJAh8Z2YWU_iFn	5de551d80c4bb25c8413f886675211ec	recording	\N	\N	\N	\N	\N	0	\N	1	VOTING	2026-02-24 07:56:57.242	\N	{}
\.


--
-- Data for Name: ActMusic; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActMusic" ("actId", "musicId", "order") FROM stdin;
20	3	0
21	2	0
22	2	0
23	2	0
24	2	0
25	2	0
26	2	0
27	2	0
\.


--
-- Data for Name: ActParticipant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActParticipant" (id, "actId", "userId", role, status, "joinedAt", "leftAt") FROM stdin;
\.


--
-- Data for Name: ActSpotAgent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActSpotAgent" (id, "actId", "userId", task, status, "assignedAt", "completedAt") FROM stdin;
\.


--
-- Data for Name: ActSpotAgentCandidate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActSpotAgentCandidate" (id, "actId", "userId", status, "appliedAt") FROM stdin;
\.


--
-- Data for Name: ActSpotAgentVote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActSpotAgentVote" (id, "candidateId", "voterId", "votedAt") FROM stdin;
\.


--
-- Data for Name: ActTask; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActTask" (id, title, "isCompleted", "createdAt", "completedAt", "actId") FROM stdin;
13	ddfdfdfdfd	f	2026-02-20 15:35:36.261	\N	20
14	vcvcxvcx	f	2026-02-20 15:38:15.578	\N	21
16	gfdgfdgfd	t	2026-02-20 19:47:06.107	2026-02-20 19:47:10.536	22
15	vxcvcxvcx	t	2026-02-20 19:47:06.108	2026-02-20 19:47:11.042	22
17	fdfdfd	f	2026-02-21 19:55:43.963	\N	23
18	папаа	f	2026-02-21 20:00:55.468	\N	24
19	fdgfgdf	f	2026-02-21 20:09:52.084	\N	25
20	dsdssdsds	f	2026-02-24 07:51:05.988	\N	26
\.


--
-- Data for Name: ActTeam; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActTeam" (id, "actId", name, "createdAt") FROM stdin;
\.


--
-- Data for Name: ActTeamCandidate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActTeamCandidate" (id, "configId", "userId") FROM stdin;
\.


--
-- Data for Name: ActTeamRoleConfig; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActTeamRoleConfig" (id, "teamId", role, "openVoting", "votingStartAt", "votingDurationHours") FROM stdin;
\.


--
-- Data for Name: ActTeamTask; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActTeamTask" (id, "teamId", "imageUrl", description, address, "order", "createdAt") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name) FROM stdin;
\.


--
-- Data for Name: Chat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Chat" (id, type, name, "imageUrl", "guildId", "createdAt", "updatedAt", "inviteCode") FROM stdin;
\.


--
-- Data for Name: ChatMember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatMember" (id, "chatId", "userId", "lastReadAt", "joinedAt") FROM stdin;
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatMessage" (id, message, "createdAt", "userId", "actId") FROM stdin;
\.


--
-- Data for Name: Effect; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Effect" (id, "fileName", "userId") FROM stdin;
\.


--
-- Data for Name: Guild; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Guild" (id, name, description, "logoFileName", "ownerId", "createdAt", "updatedAt", "coverFileName", tags) FROM stdin;
4	Main guild	Lorem description pupupupupu	https://s3.twcstorage.ru/db40905a-a32d-43ce-a541-af9428eeecda/1771969320088-7ed7787453b296e18901b5c4830a3f7b5d97682a.png	1	2026-02-24 21:42:00.971	2026-02-24 21:42:00.971	https://s3.twcstorage.ru/db40905a-a32d-43ce-a541-af9428eeecda/1771969320525-133c1306c8789c6235c8d0006bb094cc32ca9721.png	{}
\.


--
-- Data for Name: GuildAchievement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."GuildAchievement" ("guildId", "achievementId", "awardedAt") FROM stdin;
\.


--
-- Data for Name: GuildChatMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."GuildChatMessage" (id, message, "createdAt", "userId", "guildId") FROM stdin;
\.


--
-- Data for Name: GuildJoinRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."GuildJoinRequest" (id, "guildId", "userId", status, message, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Intro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Intro" (id, "fileName", "userId") FROM stdin;
1	uploads/intros/1764162877115-75180112.mp4	\N
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Message" (id, "chatId", "senderId", text, "fileUrl", "fileType", "replyToId", "forwardedFromId", "isDeleted", "createdAt") FROM stdin;
\.


--
-- Data for Name: Music; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Music" (id, "fileName", length, "userId") FROM stdin;
2	uploads/musics/1764163138794-489981590.mp3	03:37	\N
3	uploads/musics/1764163174564-188746375.mp3	03:36	\N
1	uploads/musics/1764162991178-85189419.mp3	02:59	\N
\.


--
-- Data for Name: Outro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Outro" (id, "fileName", "userId") FROM stdin;
1	uploads/outros/1764162796083-644659628.mp4	\N
\.


--
-- Data for Name: Poll; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Poll" (id, "actId", "creatorId", title, description, "endsAt", "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: PollOption; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PollOption" (id, "pollId", text) FROM stdin;
\.


--
-- Data for Name: PollVote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PollVote" (id, "pollId", "optionId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Rank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Rank" (id, name, "createdAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name) FROM stdin;
1	user
2	admin
3	main admin
\.


--
-- Data for Name: RoleCandidate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoleCandidate" (id, "actId", "userId", "roleType", method, "bidAmount", "bidItem", "appliedAt", status, "heroActId", "navigatorActId") FROM stdin;
\.


--
-- Data for Name: RoleVote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoleVote" (id, "candidateId", "voterId", "votedAt") FROM stdin;
\.


--
-- Data for Name: RoutePoint; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoutePoint" (id, "actId", latitude, longitude, "order", "createdAt") FROM stdin;
\.


--
-- Data for Name: Sequel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Sequel" (id, title, episodes, "coverFileName", "userId") FROM stdin;
1	gfdgdfgfd	3	uploads/sequels/1770818510701-910384655.png	1
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ticket" (id, title, description, img, "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TicketMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TicketMessage" (id, text, "ticketId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, login, password, email, status, "warningCount", "roleId", "terminateCount", "createdAt", "updatedAt", "refreshToken", "guildId", "avatarUrl", "fullName", "timeZone", "notifyActProgress", "notifyActStatusRealtime", "notifyAll", "notifyChatMentions", "notifyGuildInvites", "communicationLanguages", city, country, "twoFactorEnabled", "twoFactorSecret", "whoCanMessage", points) FROM stdin;
1	sadikov.vd2194	$2b$10$2DkduXtBD8ewN/Q3yaDksuwl5GomzvmnO.52mgaz7qAl0rC2rgywW	vitaly.sadikov1@yandex.ru	ACTIVE	0	3	\N	2025-11-26 08:27:36.21	2026-03-01 09:08:01.776	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImxvZ2luIjoic2FkaWtvdi52ZDIxOTQiLCJpYXQiOjE3NzIzNTYwODEsImV4cCI6MTc3Mjk2MDg4MX0.fhpZhwWAIZKIrZDohxByrhg7O4dn7L642zsDeQy3WN0	\N	https://s3.twcstorage.ru/db40905a-a32d-43ce-a541-af9428eeecda/1772136605758-5925d59599e00615e0c23fb5d4ba772448a52c58.png	Sadikov Vitaly Dmitrievich	UTC −09:30	t	t	t	f	t	{English,Español}	\N	\N	t	ENNCSXLOHYURQVLH	all	0
2	vitalysadikov9@gmail.com	$2b$10$FnGfnHFYSS8DsS2lWbCQEOuYoEalNHGH4TJbOpR1jUZ7qQkkvcASm	vitalysadikov9@gmail.com	ACTIVE	0	1	\N	2025-11-26 13:35:49.708	2026-02-24 21:48:25.41	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImxvZ2luIjoidml0YWx5c2FkaWtvdjlAZ21haWwuY29tIiwiaWF0IjoxNzY0MTY0MTQ5LCJleHAiOjE3NjQ3Njg5NDl9.I-Nf3fjG3We-mpaLGN6IqRLbc51o1jESFG_aSPMXifo	4	\N	\N	\N	t	t	t	t	t	{}	\N	\N	f	\N	all	0
8	vitaly.sadikov1	$2b$10$W/NPCUdqoXg.cRQ3eBbcG.yu0rRfPbxqEUSOqHkfIYHH2WcwdJJF.	tgflk_tuv@mail.ru	ACTIVE	0	1	\N	2026-02-19 15:47:24.271	2026-02-24 21:48:35.839	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsImxvZ2luIjoidml0YWx5LnNhZGlrb3YxIiwiaWF0IjoxNzcxNjAxMjc0LCJleHAiOjE3NzIyMDYwNzR9.zUurOQO0fL8u_SMbviSENqQvQF4TUyI7VjmqqLm4a_E	4	https://s3.twcstorage.ru/db40905a-a32d-43ce-a541-af9428eeecda/1771515756316-1bf7162ef48e583ada7f7a6bac6fc87cb6b2f949.png	Vitaly Sadikov	\N	t	t	t	t	t	{}	\N	\N	f	\N	all	0
4	\N	$2b$10$ICF9VM5m0TaWBEhOJJexmuoK56YQqvIX0XJPBuses7bHL2keZR51K	vitaly.sadikov2@yandex.ru	ACTIVE	0	1	\N	2025-11-29 10:59:03.756	2026-02-24 21:48:43.279	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQsImxvZ2luIjpudWxsLCJpYXQiOjE3NjQ0OTA1MzgsImV4cCI6MTc2NTA5NTMzOH0.WpKpL5-zkwTgvLD7GW_VD2g0gtpffnL-dMTPsxFkW8E	4	\N	\N	\N	t	t	t	t	t	{}	\N	\N	f	\N	all	0
\.


--
-- Data for Name: UserAchievement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserAchievement" ("userId", "achievementId", "awardedAt") FROM stdin;
\.


--
-- Data for Name: UserActivity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivity" (id, action, details, "createdAt", "userId", "streamId") FROM stdin;
1	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-11-26 14:45:47.559	\N	\N
2	The main administrator vitaly.sadikov1@yandex.ru created the administrator default.admin	\N	2025-11-26 15:20:08.657	\N	\N
3	The main admin vitaly.sadikov1@yandex.ru updated admin data for default.admin2	\N	2025-11-26 15:23:23.681	\N	\N
4	The main administrator vitaly.sadikov1@yandex.ru has deleted the administrator default.admin2	\N	2025-11-26 15:23:34.687	\N	\N
5	Admin vitaly.sadikov1@yandex.ru created guild: 'pvp'	\N	2025-11-26 15:28:22.141	\N	\N
6	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-12-01 17:16:52.09	\N	\N
7	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-12-01 17:18:11.366	\N	\N
8	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-12-01 17:19:34.775	\N	\N
9	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-12-01 17:20:18.184	\N	\N
10	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-12-01 17:23:12.671	\N	\N
11	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-12-02 18:19:19.792	\N	\N
12	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2026-01-15 12:16:37.673	\N	\N
13	User vitaly.sadikov1@yandex.ru started stream: 'trtrterter'	\N	2026-02-11 14:05:50.577	\N	\N
14	User vitaly.sadikov1@yandex.ru started stream: 'trtret'	\N	2026-02-11 14:11:23.664	\N	\N
15	User vitaly.sadikov1@yandex.ru started stream: 'gfgfdgfdg'	\N	2026-02-11 14:25:39.313	\N	\N
16	User vitaly.sadikov1@yandex.ru started stream: 'gfdfgdffg'	\N	2026-02-11 14:32:59.828	\N	\N
17	User vitaly.sadikov1@yandex.ru started stream: 'fgfgffg'	\N	2026-02-18 20:46:09.161	\N	\N
18	User vitaly.sadikov1 started stream: 'twtrrttr'	\N	2026-02-20 11:36:08.326	\N	\N
19	User vitaly.sadikov1 started stream: 'test'	\N	2026-02-20 11:40:08.277	\N	\N
20	User vitaly.sadikov1 started stream: 'test'	\N	2026-02-20 11:46:46.636	\N	\N
21	User vitaly.sadikov1 started stream: 'gfgfgf'	\N	2026-02-20 15:28:07.379	\N	\N
22	User vitaly.sadikov1 started stream: 'titile'	\N	2026-02-20 15:32:39.889	\N	\N
23	User vitaly.sadikov1 started stream: 'gfgdggfdgf'	\N	2026-02-20 15:35:35.792	\N	\N
24	User vitaly.sadikov1 started stream: 'gfgfgf'	\N	2026-02-20 15:38:15.264	\N	\N
25	User vitaly.sadikov1@yandex.ru started stream: 'tgfdgfgfd'	\N	2026-02-20 19:47:05.9	\N	\N
26	User vitaly.sadikov1@yandex.ru started stream: 'titllee'	\N	2026-02-21 19:55:43.489	\N	\N
27	User vitaly.sadikov1@yandex.ru started stream: 'апавпапав'	\N	2026-02-21 20:00:55.015	\N	\N
28	User vitaly.sadikov1@yandex.ru started stream: 'fgfgfd'	\N	2026-02-21 20:09:51.78	\N	\N
29	User vitaly.sadikov1@yandex.ru started stream: 'title'	\N	2026-02-24 07:51:05.876	\N	\N
30	User vitaly.sadikov1@yandex.ru started stream: 'title'	\N	2026-02-24 07:51:57.306	\N	\N
31	Admin vitaly.sadikov1@yandex.ru created guild: 'Main guild'	\N	2026-02-24 21:34:16.234	\N	\N
32	Admin vitaly.sadikov1@yandex.ru created guild: 'Main guild'	\N	2026-02-24 21:36:18.868	\N	\N
33	Admin vitaly.sadikov1@yandex.ru created guild: 'Main guild'	\N	2026-02-24 21:42:00.98	\N	\N
\.


--
-- Data for Name: UserActivityParticipants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivityParticipants" ("userId", "activityId", role) FROM stdin;
1	1	initiator
1	2	initiator
1	3	initiator
1	4	initiator
1	5	initiator
1	6	initiator
1	7	initiator
1	8	initiator
1	9	initiator
1	10	initiator
1	11	initiator
1	12	initiator
1	13	initiator
1	14	initiator
1	15	initiator
1	16	initiator
1	17	initiator
8	18	initiator
8	19	initiator
8	20	initiator
8	21	initiator
8	22	initiator
8	23	initiator
8	24	initiator
1	25	initiator
1	26	initiator
1	27	initiator
1	28	initiator
1	29	initiator
1	30	initiator
1	31	initiator
1	32	initiator
1	33	initiator
\.


--
-- Data for Name: UserRank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserRank" ("userId", "rankId") FROM stdin;
\.


--
-- Data for Name: _UserFollows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_UserFollows" ("A", "B") FROM stdin;
\.


--
-- Name: Achievement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Achievement_id_seq"', 3, true);


--
-- Name: ActParticipant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActParticipant_id_seq"', 1, false);


--
-- Name: ActSpotAgentCandidate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActSpotAgentCandidate_id_seq"', 1, false);


--
-- Name: ActSpotAgentVote_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActSpotAgentVote_id_seq"', 1, false);


--
-- Name: ActSpotAgent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActSpotAgent_id_seq"', 1, false);


--
-- Name: ActTask_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActTask_id_seq"', 20, true);


--
-- Name: ActTeamCandidate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActTeamCandidate_id_seq"', 1, false);


--
-- Name: ActTeamRoleConfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActTeamRoleConfig_id_seq"', 1, false);


--
-- Name: ActTeamTask_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActTeamTask_id_seq"', 1, false);


--
-- Name: ActTeam_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActTeam_id_seq"', 1, false);


--
-- Name: Act_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Act_id_seq"', 27, true);


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Category_id_seq"', 1, false);


--
-- Name: ChatMember_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ChatMember_id_seq"', 1, false);


--
-- Name: ChatMessage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ChatMessage_id_seq"', 1, false);


--
-- Name: Chat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Chat_id_seq"', 1, false);


--
-- Name: Effect_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Effect_id_seq"', 1, false);


--
-- Name: GuildChatMessage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."GuildChatMessage_id_seq"', 1, false);


--
-- Name: GuildJoinRequest_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."GuildJoinRequest_id_seq"', 1, false);


--
-- Name: Guild_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Guild_id_seq"', 4, true);


--
-- Name: Intro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Intro_id_seq"', 1, true);


--
-- Name: Message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Message_id_seq"', 1, false);


--
-- Name: Music_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Music_id_seq"', 3, true);


--
-- Name: Outro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Outro_id_seq"', 1, true);


--
-- Name: PollOption_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PollOption_id_seq"', 1, false);


--
-- Name: PollVote_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PollVote_id_seq"', 1, false);


--
-- Name: Poll_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Poll_id_seq"', 1, false);


--
-- Name: Rank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Rank_id_seq"', 1, false);


--
-- Name: RoleCandidate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."RoleCandidate_id_seq"', 1, false);


--
-- Name: RoleVote_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."RoleVote_id_seq"', 1, false);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 3, true);


--
-- Name: RoutePoint_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."RoutePoint_id_seq"', 3, true);


--
-- Name: Sequel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Sequel_id_seq"', 1, true);


--
-- Name: TicketMessage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TicketMessage_id_seq"', 1, false);


--
-- Name: Ticket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Ticket_id_seq"', 1, false);


--
-- Name: UserActivity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."UserActivity_id_seq"', 33, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 8, true);


--
-- Name: Achievement Achievement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achievement"
    ADD CONSTRAINT "Achievement_pkey" PRIMARY KEY (id);


--
-- Name: ActMusic ActMusic_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActMusic"
    ADD CONSTRAINT "ActMusic_pkey" PRIMARY KEY ("actId", "musicId");


--
-- Name: ActParticipant ActParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActParticipant"
    ADD CONSTRAINT "ActParticipant_pkey" PRIMARY KEY (id);


--
-- Name: ActSpotAgentCandidate ActSpotAgentCandidate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentCandidate"
    ADD CONSTRAINT "ActSpotAgentCandidate_pkey" PRIMARY KEY (id);


--
-- Name: ActSpotAgentVote ActSpotAgentVote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentVote"
    ADD CONSTRAINT "ActSpotAgentVote_pkey" PRIMARY KEY (id);


--
-- Name: ActSpotAgent ActSpotAgent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgent"
    ADD CONSTRAINT "ActSpotAgent_pkey" PRIMARY KEY (id);


--
-- Name: ActTask ActTask_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTask"
    ADD CONSTRAINT "ActTask_pkey" PRIMARY KEY (id);


--
-- Name: ActTeamCandidate ActTeamCandidate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamCandidate"
    ADD CONSTRAINT "ActTeamCandidate_pkey" PRIMARY KEY (id);


--
-- Name: ActTeamRoleConfig ActTeamRoleConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamRoleConfig"
    ADD CONSTRAINT "ActTeamRoleConfig_pkey" PRIMARY KEY (id);


--
-- Name: ActTeamTask ActTeamTask_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamTask"
    ADD CONSTRAINT "ActTeamTask_pkey" PRIMARY KEY (id);


--
-- Name: ActTeam ActTeam_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeam"
    ADD CONSTRAINT "ActTeam_pkey" PRIMARY KEY (id);


--
-- Name: Act Act_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: ChatMember ChatMember_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMember"
    ADD CONSTRAINT "ChatMember_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: Chat Chat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_pkey" PRIMARY KEY (id);


--
-- Name: Effect Effect_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Effect"
    ADD CONSTRAINT "Effect_pkey" PRIMARY KEY (id);


--
-- Name: GuildAchievement GuildAchievement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildAchievement"
    ADD CONSTRAINT "GuildAchievement_pkey" PRIMARY KEY ("guildId", "achievementId");


--
-- Name: GuildChatMessage GuildChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildChatMessage"
    ADD CONSTRAINT "GuildChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: GuildJoinRequest GuildJoinRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildJoinRequest"
    ADD CONSTRAINT "GuildJoinRequest_pkey" PRIMARY KEY (id);


--
-- Name: Guild Guild_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild"
    ADD CONSTRAINT "Guild_pkey" PRIMARY KEY (id);


--
-- Name: Intro Intro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Intro"
    ADD CONSTRAINT "Intro_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: Music Music_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Music"
    ADD CONSTRAINT "Music_pkey" PRIMARY KEY (id);


--
-- Name: Outro Outro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outro"
    ADD CONSTRAINT "Outro_pkey" PRIMARY KEY (id);


--
-- Name: PollOption PollOption_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollOption"
    ADD CONSTRAINT "PollOption_pkey" PRIMARY KEY (id);


--
-- Name: PollVote PollVote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_pkey" PRIMARY KEY (id);


--
-- Name: Poll Poll_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Poll"
    ADD CONSTRAINT "Poll_pkey" PRIMARY KEY (id);


--
-- Name: Rank Rank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rank"
    ADD CONSTRAINT "Rank_pkey" PRIMARY KEY (id);


--
-- Name: RoleCandidate RoleCandidate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleCandidate"
    ADD CONSTRAINT "RoleCandidate_pkey" PRIMARY KEY (id);


--
-- Name: RoleVote RoleVote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleVote"
    ADD CONSTRAINT "RoleVote_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: RoutePoint RoutePoint_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoutePoint"
    ADD CONSTRAINT "RoutePoint_pkey" PRIMARY KEY (id);


--
-- Name: Sequel Sequel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sequel"
    ADD CONSTRAINT "Sequel_pkey" PRIMARY KEY (id);


--
-- Name: TicketMessage TicketMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: UserAchievement UserAchievement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId", "achievementId");


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
-- Name: UserRank UserRank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRank"
    ADD CONSTRAINT "UserRank_pkey" PRIMARY KEY ("userId", "rankId");


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
-- Name: Achievement_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Achievement_name_key" ON public."Achievement" USING btree (name);


--
-- Name: ActMusic_actId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActMusic_actId_idx" ON public."ActMusic" USING btree ("actId");


--
-- Name: ActParticipant_actId_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActParticipant_actId_role_idx" ON public."ActParticipant" USING btree ("actId", role);


--
-- Name: ActParticipant_actId_userId_role_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ActParticipant_actId_userId_role_key" ON public."ActParticipant" USING btree ("actId", "userId", role);


--
-- Name: ActSpotAgentCandidate_actId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActSpotAgentCandidate_actId_idx" ON public."ActSpotAgentCandidate" USING btree ("actId");


--
-- Name: ActSpotAgentCandidate_actId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ActSpotAgentCandidate_actId_userId_key" ON public."ActSpotAgentCandidate" USING btree ("actId", "userId");


--
-- Name: ActSpotAgentCandidate_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActSpotAgentCandidate_userId_idx" ON public."ActSpotAgentCandidate" USING btree ("userId");


--
-- Name: ActSpotAgentVote_candidateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActSpotAgentVote_candidateId_idx" ON public."ActSpotAgentVote" USING btree ("candidateId");


--
-- Name: ActSpotAgentVote_candidateId_voterId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ActSpotAgentVote_candidateId_voterId_key" ON public."ActSpotAgentVote" USING btree ("candidateId", "voterId");


--
-- Name: ActSpotAgentVote_voterId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActSpotAgentVote_voterId_idx" ON public."ActSpotAgentVote" USING btree ("voterId");


--
-- Name: ActSpotAgent_actId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActSpotAgent_actId_idx" ON public."ActSpotAgent" USING btree ("actId");


--
-- Name: ActSpotAgent_actId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ActSpotAgent_actId_userId_key" ON public."ActSpotAgent" USING btree ("actId", "userId");


--
-- Name: ActSpotAgent_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActSpotAgent_userId_idx" ON public."ActSpotAgent" USING btree ("userId");


--
-- Name: ActTask_actId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActTask_actId_idx" ON public."ActTask" USING btree ("actId");


--
-- Name: ActTeamCandidate_configId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ActTeamCandidate_configId_userId_key" ON public."ActTeamCandidate" USING btree ("configId", "userId");


--
-- Name: ActTeamRoleConfig_teamId_role_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ActTeamRoleConfig_teamId_role_key" ON public."ActTeamRoleConfig" USING btree ("teamId", role);


--
-- Name: ActTeamTask_teamId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActTeamTask_teamId_idx" ON public."ActTeamTask" USING btree ("teamId");


--
-- Name: ActTeam_actId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActTeam_actId_idx" ON public."ActTeam" USING btree ("actId");


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);


--
-- Name: ChatMember_chatId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ChatMember_chatId_userId_key" ON public."ChatMember" USING btree ("chatId", "userId");


--
-- Name: ChatMember_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMember_userId_idx" ON public."ChatMember" USING btree ("userId");


--
-- Name: ChatMessage_actId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_actId_createdAt_idx" ON public."ChatMessage" USING btree ("actId", "createdAt");


--
-- Name: Chat_guildId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Chat_guildId_key" ON public."Chat" USING btree ("guildId");


--
-- Name: Chat_inviteCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Chat_inviteCode_key" ON public."Chat" USING btree ("inviteCode");


--
-- Name: GuildAchievement_guildId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GuildAchievement_guildId_idx" ON public."GuildAchievement" USING btree ("guildId");


--
-- Name: GuildChatMessage_guildId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GuildChatMessage_guildId_createdAt_idx" ON public."GuildChatMessage" USING btree ("guildId", "createdAt");


--
-- Name: GuildJoinRequest_guildId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "GuildJoinRequest_guildId_userId_key" ON public."GuildJoinRequest" USING btree ("guildId", "userId");


--
-- Name: Guild_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Guild_name_key" ON public."Guild" USING btree (name);


--
-- Name: Message_chatId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Message_chatId_createdAt_idx" ON public."Message" USING btree ("chatId", "createdAt");


--
-- Name: Message_senderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Message_senderId_idx" ON public."Message" USING btree ("senderId");


--
-- Name: PollOption_pollId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PollOption_pollId_idx" ON public."PollOption" USING btree ("pollId");


--
-- Name: PollVote_pollId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PollVote_pollId_idx" ON public."PollVote" USING btree ("pollId");


--
-- Name: PollVote_pollId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON public."PollVote" USING btree ("pollId", "userId");


--
-- Name: Poll_actId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Poll_actId_idx" ON public."Poll" USING btree ("actId");


--
-- Name: Rank_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Rank_name_key" ON public."Rank" USING btree (name);


--
-- Name: RoleCandidate_actId_roleType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RoleCandidate_actId_roleType_idx" ON public."RoleCandidate" USING btree ("actId", "roleType");


--
-- Name: RoleCandidate_actId_userId_roleType_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RoleCandidate_actId_userId_roleType_key" ON public."RoleCandidate" USING btree ("actId", "userId", "roleType");


--
-- Name: RoleVote_candidateId_voterId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RoleVote_candidateId_voterId_key" ON public."RoleVote" USING btree ("candidateId", "voterId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: RoutePoint_actId_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RoutePoint_actId_order_idx" ON public."RoutePoint" USING btree ("actId", "order");


--
-- Name: UserAchievement_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserAchievement_userId_idx" ON public."UserAchievement" USING btree ("userId");


--
-- Name: UserRank_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserRank_userId_idx" ON public."UserRank" USING btree ("userId");


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
-- Name: ActMusic ActMusic_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActMusic"
    ADD CONSTRAINT "ActMusic_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActMusic ActMusic_musicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActMusic"
    ADD CONSTRAINT "ActMusic_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES public."Music"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActParticipant ActParticipant_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActParticipant"
    ADD CONSTRAINT "ActParticipant_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActParticipant ActParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActParticipant"
    ADD CONSTRAINT "ActParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActSpotAgentCandidate ActSpotAgentCandidate_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentCandidate"
    ADD CONSTRAINT "ActSpotAgentCandidate_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActSpotAgentCandidate ActSpotAgentCandidate_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentCandidate"
    ADD CONSTRAINT "ActSpotAgentCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActSpotAgentVote ActSpotAgentVote_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentVote"
    ADD CONSTRAINT "ActSpotAgentVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."ActSpotAgentCandidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActSpotAgentVote ActSpotAgentVote_voterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgentVote"
    ADD CONSTRAINT "ActSpotAgentVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActSpotAgent ActSpotAgent_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgent"
    ADD CONSTRAINT "ActSpotAgent_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActSpotAgent ActSpotAgent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActSpotAgent"
    ADD CONSTRAINT "ActSpotAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActTask ActTask_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTask"
    ADD CONSTRAINT "ActTask_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActTeamCandidate ActTeamCandidate_configId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamCandidate"
    ADD CONSTRAINT "ActTeamCandidate_configId_fkey" FOREIGN KEY ("configId") REFERENCES public."ActTeamRoleConfig"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActTeamCandidate ActTeamCandidate_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamCandidate"
    ADD CONSTRAINT "ActTeamCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActTeamRoleConfig ActTeamRoleConfig_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamRoleConfig"
    ADD CONSTRAINT "ActTeamRoleConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."ActTeam"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActTeamTask ActTeamTask_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeamTask"
    ADD CONSTRAINT "ActTeamTask_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."ActTeam"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActTeam ActTeam_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActTeam"
    ADD CONSTRAINT "ActTeam_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Act Act_effectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_effectId_fkey" FOREIGN KEY ("effectId") REFERENCES public."Effect"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_introId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_introId_fkey" FOREIGN KEY ("introId") REFERENCES public."Intro"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_outroId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_outroId_fkey" FOREIGN KEY ("outroId") REFERENCES public."Outro"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_sequelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_sequelId_fkey" FOREIGN KEY ("sequelId") REFERENCES public."Sequel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMember ChatMember_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMember"
    ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMember ChatMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMember"
    ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chat Chat_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public."Guild"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Effect Effect_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Effect"
    ADD CONSTRAINT "Effect_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GuildAchievement GuildAchievement_achievementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildAchievement"
    ADD CONSTRAINT "GuildAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES public."Achievement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GuildAchievement GuildAchievement_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildAchievement"
    ADD CONSTRAINT "GuildAchievement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public."Guild"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GuildChatMessage GuildChatMessage_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildChatMessage"
    ADD CONSTRAINT "GuildChatMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public."Guild"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GuildChatMessage GuildChatMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildChatMessage"
    ADD CONSTRAINT "GuildChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GuildJoinRequest GuildJoinRequest_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildJoinRequest"
    ADD CONSTRAINT "GuildJoinRequest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public."Guild"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GuildJoinRequest GuildJoinRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GuildJoinRequest"
    ADD CONSTRAINT "GuildJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Intro Intro_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Intro"
    ADD CONSTRAINT "Intro_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_forwardedFromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_forwardedFromId_fkey" FOREIGN KEY ("forwardedFromId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_replyToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Music Music_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Music"
    ADD CONSTRAINT "Music_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Outro Outro_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outro"
    ADD CONSTRAINT "Outro_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PollOption PollOption_pollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollOption"
    ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."Poll"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PollVote PollVote_optionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES public."PollOption"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PollVote PollVote_pollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."Poll"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PollVote PollVote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Poll Poll_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Poll"
    ADD CONSTRAINT "Poll_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Poll Poll_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Poll"
    ADD CONSTRAINT "Poll_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleCandidate RoleCandidate_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleCandidate"
    ADD CONSTRAINT "RoleCandidate_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleCandidate RoleCandidate_heroActId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleCandidate"
    ADD CONSTRAINT "RoleCandidate_heroActId_fkey" FOREIGN KEY ("heroActId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RoleCandidate RoleCandidate_navigatorActId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleCandidate"
    ADD CONSTRAINT "RoleCandidate_navigatorActId_fkey" FOREIGN KEY ("navigatorActId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RoleCandidate RoleCandidate_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleCandidate"
    ADD CONSTRAINT "RoleCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleVote RoleVote_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleVote"
    ADD CONSTRAINT "RoleVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."RoleCandidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleVote RoleVote_voterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoleVote"
    ADD CONSTRAINT "RoleVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoutePoint RoutePoint_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoutePoint"
    ADD CONSTRAINT "RoutePoint_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sequel Sequel_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sequel"
    ADD CONSTRAINT "Sequel_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TicketMessage TicketMessage_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TicketMessage TicketMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserAchievement UserAchievement_achievementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES public."Achievement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserAchievement UserAchievement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
    ADD CONSTRAINT "UserActivity_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserActivity UserActivity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRank UserRank_rankId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRank"
    ADD CONSTRAINT "UserRank_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES public."Rank"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRank UserRank_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRank"
    ADD CONSTRAINT "UserRank_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--


