import { HomePage } from './HomePage';
import { getSetting } from '@/lib/db';

export async function generateMetadata() {
  try {
    const blogTitle = await getSetting('blog_title');
    return { title: { absolute: blogTitle || 'My Blog' } };
  } catch {
    return { title: { absolute: 'My Blog' } };
  }
}

export default function Page() {
  return <HomePage />;
}
