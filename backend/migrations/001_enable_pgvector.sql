-- Migration 001: Enable pgvector extension
-- Target: PostgreSQL with pgvector support

CREATE EXTENSION IF NOT EXISTS vector;
