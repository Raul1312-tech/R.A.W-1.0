begin;
alter table public.food_photo_reviews drop constraint food_photo_reviews_pkey;
alter table public.food_photo_reviews drop constraint food_photo_reviews_owner_request_day_input_hash_key;
alter table public.food_photo_reviews add primary key(organization_id,owner,request_day,slot);
alter table public.food_photo_reviews add unique(organization_id,owner,request_day,input_hash);
create index food_photo_reviews_owner_fk on public.food_photo_reviews(owner);
commit;
