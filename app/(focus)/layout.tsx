import {Suspense} from 'react';
import {QuickReturn} from '@/components/shell/QuickReturn';
import { Wordmark, SyncNotice } from '@/components/shell/AppShell';
export default function FocusLayout({ children }: { children: React.ReactNode }) { return <><a href="#main-content" className="skip-link">Skip to content</a><header className="focus-header"><Wordmark/></header><main id="main-content" className="focus-main" tabIndex={-1}><SyncNotice/><Suspense fallback={null}><QuickReturn/></Suspense>{children}</main></>; }
