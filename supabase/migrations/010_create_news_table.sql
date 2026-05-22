-- Migration: 010_create_news_table
-- Description: Создание таблицы новостей и RLS политик для EXPO 365

-- ══════════════════════════════════════════════════════════════════
-- TABLE: news
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS news (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core content
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('coffee', 'equipment', 'food', 'cleaning', 'finance', 'hr', 'event', 'other')),
  promo_type TEXT NOT NULL CHECK (promo_type IN ('new', 'sale', 'special', 'event', 'announcement')),
  content TEXT NOT NULL,
  image_url TEXT,
  
  -- Status & dates
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published')) DEFAULT 'draft',
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metrics
  views INTEGER NOT NULL DEFAULT 0,
  
  -- Relationships
  exhibitor_id UUID REFERENCES exhibitors(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Indexes for performance
  CONSTRAINT valid_publish_date CHECK (publish_date >= DATE '2020-01-01')
);

-- ══════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_news_status_publish_date ON news(status, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_exhibitor_id ON news(exhibitor_id);
CREATE INDEX IF NOT EXISTS idx_news_created_by ON news(created_by);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_promo_type ON news(promo_type);

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Policy 1: Все пользователи (включая анонимных) могут читать опубликованные новости
CREATE POLICY "Публичный доступ к опубликованным новостям"
  ON news FOR SELECT
  USING (status = 'published' AND publish_date <= CURRENT_DATE);

-- Policy 2: Аутентифицированные пользователи могут читать свои черновики и запланированные новости
CREATE POLICY "Доступ к своим новостям"
  ON news FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'exhibitor')
    )
  );

-- Policy 3: Экспоненты и администраторы могут создавать новости
CREATE POLICY "Создание новостей для экспонентов и администраторов"
  ON news FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'exhibitor')
    )
  );

-- Policy 4: Редактирование своих новостей (экспоненты и администраторы)
CREATE POLICY "Редактирование своих новостей"
  ON news FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy 5: Удаление своих новостей (экспоненты и администраторы)
CREATE POLICY "Удаление своих новостей"
  ON news FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════════

-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════

-- Функция для увеличения счетчика просмотров
CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE news 
  SET views = views + 1 
  WHERE id = news_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для публикации новости
CREATE OR REPLACE FUNCTION publish_news(news_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE news 
  SET 
    status = 'published',
    publish_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = news_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════
-- COMMENTS
-- ══════════════════════════════════════════════════════════════════

COMMENT ON TABLE news IS 'Новости и акции экспонентов EXPO 365';
COMMENT ON COLUMN news.title IS 'Заголовок новости';
COMMENT ON COLUMN news.category IS 'Категория продукции (coffee, equipment, food, cleaning, finance, hr, event, other)';
COMMENT ON COLUMN news.promo_type IS 'Тип предложения (new, sale, special, event, announcement)';
COMMENT ON COLUMN news.content IS 'Текст новости';
COMMENT ON COLUMN news.image_url IS 'URL изображения';
COMMENT ON COLUMN news.status IS 'Статус (draft, scheduled, published)';
COMMENT ON COLUMN news.publish_date IS 'Дата публикации';
COMMENT ON COLUMN news.views IS 'Количество просмотров';
COMMENT ON COLUMN news.exhibitor_id IS 'Ссылка на экспонента';
COMMENT ON COLUMN news.created_by IS 'Пользователь, создавший новость';