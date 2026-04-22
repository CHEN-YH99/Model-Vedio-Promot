---
name: enterprise-vue-ts-scss-node-mongodb
description: Enterprise full-stack standards for Vue + TypeScript + SCSS + Node.js + MongoDB. Use when Codex needs to build, review, or refactor this stack with strict naming rules, clear module boundaries, component decomposition, formatting consistency, maintainability controls, performance optimization, and production SEO requirements.
---

# Enterprise Vue TS SCSS Node MongoDB

���� Vue + TypeScript + SCSS + Node.js + MongoDB ����ҵ��ʵ�����ع��淶��Ŀ�����ý�������ڽṹ����������ά���ԡ����ܡ�SEO �������Ž��Ͽɳ�����

## ִ������

������˳��ִ�У����ǲֿ����и��ϸ����̣�

1. ��ȷĿ����������Ⱦ���ԡ�
2. �̻�ǰ��˷ֲ�ṹ��߽硣
3. ͳһ�����������ʽ������
4. ��ְ���������ģ�顣
5. ���������Ž���lint/typecheck/test/build����
6. �������Ż���ǰ�ˡ�Node��MongoDB����
7. �� SEO �������޸���Ԫ��Ϣ��վ���ͼ���ṹ�����ݣ���
8. ������˵������֤�����ʣ����ա�

## Ŀ����������Ⱦ����

���ж��Ƿ�����ʵ SEO ����

- Ӫ��ҳ������ҳ�����ҳ������ SSR/SSG������ Nuxt����
- ��¼�����̨���ڲ�ϵͳ������ SPA�������������� SEO ��ɷ����ԡ�
- ���վ�㣺����ҳ�� SSR/SSG����̨ҳ�� SPA��·�ɺ͹������Ρ�

��Ҫ�ڴ� SPA �ϡ�Ӳ�� SEO�������ҵ�����������������������ȸ���Ⱦģʽ������ֻ�� meta��

## �ṹ��ģ��߽�

�Ƚ��������ṹ����д���ܴ��롣Ŀ¼������߽�������

- [references/project-structure.md](references/project-structure.md)

Ӳ��Ҫ��

- ��ҵ������֯ģ�飬����������ƽ��ȫ��Ŀ��
- `shared` ֻ�ܷ���ҵ�����ͨ��������
- ǰ��ҳ��㲻��ֱ�ӷ������ݿ���� SDK��
- ��� `controller` ������ҵ���߼���ҵ���߼��� `service`�����ݷ��ʽ� `repository`��

## �ϸ��������ʽ�淶

�����������͸�ʽ������������չ����ϸ�淶����

- [references/naming-style-guide.md](references/naming-style-guide.md)
- [references/quality-gates.md](references/quality-gates.md)

Ӳ��Ҫ��

- Vue ����ļ�ʹ�� `PascalCase.vue`��
- Ŀ¼����ͨ�ļ���·�ɶ�ʹ�� `kebab-case`��
- `composable` ������ `use` ��ͷ���� `useOrderFilters.ts`��
- ����ʹ�� `UPPER_SNAKE_CASE`������/����ʹ�� `camelCase`������/��/�ӿ�ʹ�� `PascalCase`��
- SCSS ʹ�� BEM����ֹ��������д������

## ���������ά���Թ���

������Ŀ���ǡ����ھۡ�����ϡ��ɲ��ԡ���

- ���� Vue ���ְ��һ������С�����϶����Ǿ���ҳ�������
- ��ҵ���߼���������뵽 `composables`/`services`��
- ��ͨ��״̬������ store���ֲ�״̬��������ڲ���
- ÿ��ҵ�����ṩ��ȷ���� API��barrel ������ģ����ڣ���
- �������ֱ�������ڲ�ʵ�֣�����ͨ����ʽ�ӿڽ�����

�����ع���ֵ����һ���м���֣���

- ���ļ�����Լ 250-300 ���ҳ���������
- `props` ���� 8 ���Ҵ��ڶ���������ϡ�
- ͬһ�߼��� 3 ���������ظ����֡�
- ���ͬʱ���� UI ��Ⱦ��������ź͸�������ת����

## ������ SEO ִ���嵥

ִ��ǰ��Ҫ�Ա���֤�������嵥����

- [references/performance-seo-checklist.md](references/performance-seo-checklist.md)

���ٸ��ǣ�

- ǰ�ˣ�·�ɼ�������ء�ͼƬ�Ż����ؼ�·�� CSS�����б����⻯��������ԡ�
- Node���ӿڷ�ҳ���ֶβü���������ơ�����㡢�ȵ�ӿ� profiling��
- MongoDB��������顢`explain` ��֤���ۺϹܵ����������ѯ�����
- SEO��Ψһ title/description��canonical��sitemap��robots���ṹ�����ݡ�Open Graph/Twitter ��Ƭ��

## �����Ž�

�ύǰ���ٱ�֤��

- `lint` �޴���
- `typecheck` ͨ����
- ����·������ͨ����
- ����ͨ����

�޷���ɵļ��Ҫ��ȷ˵��ԭ��Ӱ����Ͳ��ȷ�����������ȥ��

## ���Ҫ��

�㱨���ʱ���������

1. ������Щ�ṹ/����/��ֱ����
2. ������Щ������ SEO �����
3. ʵ��ִ������Щ��֤��������ۡ�
4. �Դ��ڵķ�����������顣

��Ҫֻ����������Ż�����Ҫ��������֤����ʵ��߽�������
