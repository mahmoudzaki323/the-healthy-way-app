-- Production-safe content seed.
-- This file intentionally does not create auth users, passwords, profiles, invite
-- codes, client progress, private messages, or coach/client relationships.

insert into public.programs (
  id,
  slug,
  coach_id,
  title,
  description,
  duration_weeks,
  best_for,
  status,
  published_at,
  created_by,
  sort_order
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'fit-fueled',
    null,
    'Fit & Fueled',
    'Balanced nutrition and effective workouts to feel strong, energized, and confident.',
    8,
    'Energy, balanced meals, strength, and healthy habits',
    'published',
    now() - interval '30 days',
    null,
    1
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'strong-lifestyle',
    null,
    'Strong Lifestyle',
    'Build strength, improve performance, and create a lifestyle that lasts.',
    8,
    'Strength, recomposition, and performance habits',
    'published',
    now() - interval '25 days',
    null,
    2
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'whole-balanced',
    null,
    'Whole & Balanced',
    'A whole-food, plant-forward approach to feeling your best naturally.',
    6,
    'Plant-forward meals, digestion, and longevity',
    'published',
    now() - interval '20 days',
    null,
    3
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  duration_weeks = excluded.duration_weeks,
  best_for = excluded.best_for,
  status = excluded.status,
  sort_order = excluded.sort_order;

insert into public.program_weeks (id, program_id, week_number, title, description, sort_order)
values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 'Foundation', 'Set up balanced meals and simple movement.', 1),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2, 'Build Momentum', 'Create consistency with workouts and meal prep.', 2),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 3, 'Level Up', 'Dial in protein, color, and strength progression.', 3),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 4, 'Push Forward', 'Handle busy weeks without all-or-nothing thinking.', 4)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.lessons (id, program_week_id, title, body, status, sort_order)
values
  ('12000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000001', 'Start Where You Are', 'Define your baseline without judgment and choose the first repeatable habit.', 'published', 1),
  ('12000000-0000-0000-0000-000000000011', '11000000-0000-0000-0000-000000000002', 'Simple Prep Rhythm', 'Choose two proteins, two colorful sides, and one emergency meal before the week starts.', 'published', 1),
  ('12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'Power Plates', 'Build plates around protein, color, fiber, and satisfaction so healthy eating feels repeatable.', 'published', 1),
  ('12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000003', 'Strength Training Basics', 'Use controlled reps, progressive effort, and recovery to get stronger safely.', 'published', 2),
  ('12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', 'Recovery & Rest', 'Protect sleep, hydration, and stress capacity so consistency lasts.', 'published', 3)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  status = excluded.status,
  sort_order = excluded.sort_order;

insert into public.recipes (
  id,
  coach_id,
  title,
  description,
  meal_type,
  cuisine,
  difficulty,
  servings,
  prep_minutes,
  cook_minutes,
  calories,
  protein,
  carbs,
  fat,
  dietary_tags,
  image_url,
  tips,
  status,
  published_at,
  created_by
)
values
  ('20000000-0000-0000-0000-000000000001', null, 'Lemon Herb Salmon Bowl', 'Quinoa, roasted vegetables, avocado, and lemon tahini drizzle.', 'Lunch', 'Mediterranean', 'Easy', 1, 15, 15, 340, 32, 12, 18, array['High Protein', 'Gluten-Free', 'Dairy-Free'], null, 'Batch cook quinoa and roast vegetables ahead for faster lunches.', 'published', now() - interval '15 days', null),
  ('20000000-0000-0000-0000-000000000002', null, 'Protein Oatmeal', 'Creamy oats with protein, berries, almonds, and cinnamon.', 'Breakfast', 'Everyday', 'Easy', 1, 5, 8, 320, 18, 42, 9, array['Vegetarian', 'High Fiber'], null, 'Use milk of choice and add berries after cooking.', 'published', now() - interval '12 days', null),
  ('20000000-0000-0000-0000-000000000003', null, 'Greek Chicken Salad', 'Grilled chicken, cucumbers, tomatoes, olives, herbs, and feta.', 'Dinner', 'Mediterranean', 'Easy', 1, 20, 10, 360, 28, 21, 14, array['High Protein', 'Balanced'], null, 'Keep dressing separate until serving.', 'published', now() - interval '10 days', null)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  meal_type = excluded.meal_type,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  prep_minutes = excluded.prep_minutes,
  cook_minutes = excluded.cook_minutes,
  calories = excluded.calories,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fat = excluded.fat,
  dietary_tags = excluded.dietary_tags,
  tips = excluded.tips,
  status = excluded.status;

insert into public.recipe_ingredients (id, recipe_id, label, quantity, sort_order)
values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Salmon fillet', '5 oz', 1),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Cooked quinoa', '1/2 cup', 2),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Avocado', '1/4', 3),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Rolled oats', '1/2 cup', 1),
  ('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'Protein powder', '1 scoop', 2),
  ('21000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', 'Grilled chicken', '5 oz', 1),
  ('21000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'Cucumber and tomatoes', '2 cups', 2)
on conflict (id) do update set
  label = excluded.label,
  quantity = excluded.quantity,
  sort_order = excluded.sort_order;

insert into public.recipe_steps (id, recipe_id, body, sort_order)
values
  ('22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Season and cook salmon until just flaky.', 1),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Add quinoa and vegetables to a bowl, then top with salmon and tahini.', 2),
  ('22000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Cook oats, stir in protein, and top with berries and almonds.', 1),
  ('22000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'Layer vegetables, chicken, olives, and feta, then dress before serving.', 1)
on conflict (id) do update set
  body = excluded.body,
  sort_order = excluded.sort_order;

insert into public.workouts (
  id,
  coach_id,
  title,
  description,
  category,
  difficulty,
  duration_minutes,
  equipment,
  calories_estimate,
  video_url,
  coach_notes,
  safety_notes,
  status,
  published_at,
  created_by
)
values
  ('30000000-0000-0000-0000-000000000001', null, 'Lower Body Strength', 'Build lower body strength and stability with focused, controlled movement.', 'Strength', 'Intermediate', 45, array['Dumbbells', 'Mat'], 320, null, 'Focus on controlled movement and form.', 'Stop if sharp pain appears.', 'published', now() - interval '15 days', null),
  ('30000000-0000-0000-0000-000000000002', null, 'Upper Body Strength', 'Strengthen and tone your upper body with simple dumbbell work.', 'Strength', 'Intermediate', 45, array['Dumbbells'], 290, null, 'Keep shoulders relaxed and ribs stacked.', 'Choose a lighter weight for clean reps.', 'published', now() - interval '12 days', null),
  ('30000000-0000-0000-0000-000000000003', null, 'Mobility Flow', 'Reduce tension and recover with gentle mobility work.', 'Mobility', 'All Levels', 20, array['Mat'], 120, null, 'Move slowly and breathe.', 'Stay in pain-free range.', 'published', now() - interval '8 days', null)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  difficulty = excluded.difficulty,
  duration_minutes = excluded.duration_minutes,
  equipment = excluded.equipment,
  calories_estimate = excluded.calories_estimate,
  video_url = excluded.video_url,
  status = excluded.status;

insert into public.workout_exercises (id, workout_id, name, sets, reps, rest, sort_order)
values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Goblet Squat', 3, '12 reps', '60s', 1),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Romanian Deadlift', 3, '10 reps', '60s', 2),
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'Reverse Lunge', 3, '10 reps each side', '45s', 3),
  ('31000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Hip Thrust', 3, '12 reps', '60s', 4),
  ('31000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 'Dumbbell Row', 3, '12 reps', '45s', 1),
  ('31000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', 'Cat Cow', 2, '8 breaths', '30s', 1)
on conflict (id) do update set
  name = excluded.name,
  sets = excluded.sets,
  reps = excluded.reps,
  rest = excluded.rest,
  sort_order = excluded.sort_order;

insert into public.program_items (id, program_week_id, program_id, item_type, item_id, title, required, sort_order)
values
  ('13000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'lesson', '12000000-0000-0000-0000-000000000010', 'Lesson: Start Where You Are', true, 1),
  ('13000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'lesson', '12000000-0000-0000-0000-000000000011', 'Lesson: Simple Prep Rhythm', true, 1),
  ('13000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'lesson', '12000000-0000-0000-0000-000000000001', 'Lesson: Power Plates', true, 1),
  ('13000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'workout', '30000000-0000-0000-0000-000000000001', 'Lower Body Strength', true, 2),
  ('13000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'recipe', '20000000-0000-0000-0000-000000000001', 'Lemon Herb Salmon Bowl', false, 3)
on conflict (id) do update set
  title = excluded.title,
  required = excluded.required,
  sort_order = excluded.sort_order;

insert into public.resources (
  id,
  coach_id,
  title,
  summary,
  body,
  type,
  topic,
  url,
  read_minutes,
  tags,
  featured,
  status,
  published_at,
  created_by
)
values
  ('60000000-0000-0000-0000-000000000001', null, 'Balanced Plate Guide', 'A simple framework for building satisfying meals.', 'Use protein, color, fiber, and flavor as your anchors. This guide helps you build flexible meals without tracking every bite.', 'article', 'Nutrition', 'https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/', 6, array['nutrition', 'mindful eating'], true, 'published', now() - interval '14 days', null),
  ('60000000-0000-0000-0000-000000000002', null, 'Pre-Call Worksheet', 'Prepare your weekly wins, questions, and obstacles.', 'Download and complete before live calls so coaching time is focused and useful.', 'worksheet', 'Coaching', '/resources/download?resource=pre-call-worksheet', 3, array['check-in', 'calls'], false, 'published', now() - interval '10 days', null)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  type = excluded.type,
  topic = excluded.topic,
  url = excluded.url,
  read_minutes = excluded.read_minutes,
  tags = excluded.tags,
  featured = excluded.featured,
  status = excluded.status;

insert into public.calendar_events (
  id,
  coach_id,
  client_id,
  program_id,
  event_type,
  title,
  description,
  starts_at,
  ends_at,
  item_type,
  item_id,
  call_url,
  required,
  status
)
values
  ('50000000-0000-0000-0000-000000000001', null, null, '10000000-0000-0000-0000-000000000001', 'workout', 'Lower Body Strength', 'Assigned strength session.', date_trunc('day', now()) + interval '6 hours 30 minutes', date_trunc('day', now()) + interval '7 hours 15 minutes', 'workout', '30000000-0000-0000-0000-000000000001', null, true, 'published'),
  ('50000000-0000-0000-0000-000000000002', null, null, '10000000-0000-0000-0000-000000000001', 'meal', 'Protein + Color', 'Focus on balanced meals with lean protein and colorful veggies.', date_trunc('day', now()) + interval '17 hours', date_trunc('day', now()) + interval '18 hours', 'recipe', '20000000-0000-0000-0000-000000000001', null, false, 'published'),
  ('50000000-0000-0000-0000-000000000003', null, null, '10000000-0000-0000-0000-000000000001', 'live_call', 'Live Coaching Call', 'Weekly call to review progress, wins, and goals.', date_trunc('day', now()) + interval '12 hours', date_trunc('day', now()) + interval '13 hours', 'live_call', '50000000-0000-0000-0000-000000000003', null, true, 'published'),
  ('50000000-0000-0000-0000-000000000004', null, null, '10000000-0000-0000-0000-000000000001', 'check_in', 'Accountability Check-in', 'Share wins, challenges, and support needed.', date_trunc('day', now()) + interval '21 hours', date_trunc('day', now()) + interval '21 hours 30 minutes', 'check_in', null, null, true, 'published')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  item_type = excluded.item_type,
  item_id = excluded.item_id,
  call_url = excluded.call_url,
  required = excluded.required,
  status = excluded.status;

insert into public.event_agenda_items (id, event_id, starts_at, label, sort_order)
values
  ('53000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', '12:00', 'Welcome & Check-in', 1),
  ('53000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', '12:10', 'Wins & Lessons', 2),
  ('53000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', '12:30', 'Topic Deep Dive', 3),
  ('53000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '12:50', 'Q&A', 4)
on conflict (id) do update set
  starts_at = excluded.starts_at,
  label = excluded.label,
  sort_order = excluded.sort_order;

insert into public.event_resources (id, event_id, resource_id)
values
  ('61000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002'),
  ('61000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

delete from public.event_resources
where resource_id in (
  '60000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000004',
  '60000000-0000-0000-0000-000000000005'
);

delete from public.resources
where id in (
  '60000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000004',
  '60000000-0000-0000-0000-000000000005'
);

insert into public.goals (id, coach_id, client_id, title, icon, description, target_days, metric, reminder_time, why_it_matters, status, created_by)
values
  ('70000000-0000-0000-0000-000000000001', null, null, 'Eat with Intention', 'leaf', 'Focus on balanced meals and mindful choices most days.', 5, 'Balanced meals', '08:00', 'To feel energized without obsessing over food.', 'published', null),
  ('70000000-0000-0000-0000-000000000002', null, null, 'Move Your Body', 'shoe', 'Find movement you enjoy and build consistency.', 4, 'Movement sessions', '07:00', 'To build confidence and energy.', 'published', null),
  ('70000000-0000-0000-0000-000000000003', null, null, 'Build Strength', 'dumbbell', 'Strength train to feel capable, strong, and energized.', 3, 'Strength sessions', '07:00', 'To feel strong in real life.', 'published', null)
on conflict (id) do update set
  title = excluded.title,
  icon = excluded.icon,
  description = excluded.description,
  target_days = excluded.target_days,
  metric = excluded.metric,
  reminder_time = excluded.reminder_time,
  why_it_matters = excluded.why_it_matters,
  status = excluded.status;

insert into public.community_topics (id, slug, title, description, sort_order)
values
  ('90000000-0000-0000-0000-000000000001', 'discussion', 'Discussion', 'General discussion and support.', 1),
  ('90000000-0000-0000-0000-000000000002', 'ask-a-question', 'Ask a Question', 'Questions for the coach and community.', 2),
  ('90000000-0000-0000-0000-000000000003', 'wins', 'Wins', 'Celebrate progress big and small.', 3),
  ('90000000-0000-0000-0000-000000000004', 'meal-ideas', 'Meal Ideas', 'Share practical meals and prep ideas.', 4),
  ('90000000-0000-0000-0000-000000000005', 'mindset', 'Mindset', 'Relationship with food and habit support.', 5)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.community_posts (id, topic_id, author_id, title, body, pinned)
values
  ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', null, 'Coach Announcement', 'Welcome to our private community. This is your space to connect, share wins, ask questions, and support one another. Be kind, be respectful, and celebrate progress.', true),
  ('91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003', null, 'A calmer week with food', 'Planning two easy dinners can make the week feel less stressful. Share one small step that helped you recently.', false)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  pinned = excluded.pinned,
  hidden_at = null;

insert into public.community_comments (id, post_id, author_id, body)
values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002', null, 'This is exactly the kind of consistency we are building. Keep the steps small and repeatable.')
on conflict (id) do update set
  body = excluded.body,
  hidden_at = null;
