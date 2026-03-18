import React, { useState, useEffect } from 'react';
import { BookOpen, List, History, ClipboardList, PlusCircle, CheckCircle, XCircle, ExternalLink, Menu, X, LogOut } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';

type CourseCategory = '外部實體' | '外部線上' | '內部實體' | '內部數位學習平台';

interface Course {
  id: string;
  category: CourseCategory;
  name: string;
  startDate: string;
  endDate: string;
  time: string;
  location: string;
  link?: string;
  description: string;
  status: 'active' | 'inactive';
}

interface Registration {
  id: string;
  courseId: string;
  employeeId: string;
  employeeName: string;
  registrationDate: string;
}

interface TrainingRecord {
  id: string;
  courseName: string;
  employeeId: string;
  employeeName: string;
  completionDate: string;
  hours: number;
}

const INITIAL_COURSES: Course[] = [
  {
    id: '1',
    category: '內部實體',
    name: '食品安全衛生教育訓練',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    time: '14:00 - 16:00',
    location: '總部大樓 3F 會議室',
    description: '年度食品安全衛生教育訓練，所有生產線同仁必修。',
    status: 'active'
  },
  {
    id: '2',
    category: '外部線上',
    name: 'ESG 企業永續發展實務',
    startDate: '2026-04-15',
    endDate: '2026-04-15',
    time: '10:00 - 12:00',
    location: '線上會議 (Teams)',
    link: 'https://teams.microsoft.com/l/meetup-join/...',
    description: '邀請外部講師分享 ESG 實務案例。',
    status: 'active'
  }
];

const INITIAL_REGISTRATIONS: Registration[] = [
  {
    id: 'r1',
    courseId: '1',
    employeeId: 'EMP001',
    employeeName: '王小明',
    registrationDate: '2026-03-16'
  }
];

const INITIAL_RECORDS: TrainingRecord[] = [
  {
    id: 'tr1',
    courseName: '新進員工訓練',
    employeeId: 'EMP001',
    employeeName: '王小明',
    completionDate: '2025-12-01',
    hours: 8
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('policy');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setIsConnected(true);

    const unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
    }, (error) => {
      console.error("Error fetching courses:", error);
      setIsConnected(false);
    });

    const unsubscribeRegistrations = onSnapshot(collection(db, 'registrations'), (snapshot) => {
      const registrationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
      setRegistrations(registrationsData);
    }, (error) => {
      console.error("Error fetching registrations:", error);
    });

    const unsubscribeRecords = onSnapshot(collection(db, 'records'), (snapshot) => {
      const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRecord));
      setRecords(recordsData);
    }, (error) => {
      console.error("Error fetching records:", error);
    });

    return () => {
      unsubscribeCourses();
      unsubscribeRegistrations();
      unsubscribeRecords();
    };
  }, [user]);

  // Form states for Add Course
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    category: '內部實體',
    status: 'active'
  });

  // Form states for Registration
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regEmployeeName, setRegEmployeeName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'courses'), {
        category: newCourse.category,
        name: newCourse.name || '',
        startDate: newCourse.startDate || '',
        endDate: newCourse.endDate || '',
        time: newCourse.time || '',
        location: newCourse.location || '',
        link: newCourse.link || '',
        description: newCourse.description || '',
        status: 'active',
        createdAt: serverTimestamp()
      });
      setNewCourse({ category: '內部實體', status: 'active' });
      alert('課程新增成功！');
    } catch (error) {
      console.error("Error adding course: ", error);
      alert('課程新增失敗，請稍後再試。');
    }
  };

  const handleToggleCourseStatus = async (id: string) => {
    const course = courses.find(c => c.id === id);
    if (course) {
      try {
        await updateDoc(doc(db, 'courses', id), {
          status: course.status === 'active' ? 'inactive' : 'active'
        });
      } catch (error) {
        console.error("Error updating course status: ", error);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !regEmployeeId || !regEmployeeName) {
      alert('請填寫完整報名資訊');
      return;
    }
    try {
      await addDoc(collection(db, 'registrations'), {
        courseId: selectedCourseId,
        employeeId: regEmployeeId,
        employeeName: regEmployeeName,
        registrationDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      setRegEmployeeId('');
      setRegEmployeeName('');
      setSelectedCourseId('');
      alert('報名成功！');
    } catch (error) {
      console.error("Error registering: ", error);
      alert('報名失敗，請稍後再試。');
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("登入失敗，請稍後再試。");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">載入中...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
          <BookOpen className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">企業教育訓練系統</h1>
          <p className="text-gray-600 mb-6">請先登入以繼續使用系統</p>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            使用 Google 帳號登入
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'policy':
        return (
          <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">訓練政策</h2>
            <div className="prose max-w-none text-gray-700 space-y-6 leading-relaxed text-base md:text-lg">
              <p className="text-justify">
                本公司承諾『提供公司全體員工完整及專業之教育訓練，以提升全體員工工作職能而成為公司所需之專業之人才，除能勝任工作並有優異之表現以滿足其成就感及職涯發展所需，並能促進公司創新與改善以達成永續經營之目標』。並將依以下原則，貫徹教育訓練活動之進行，以及定期評估執行成效及持續改善。
              </p>
              
              <div className="space-y-3 pl-2">
                <div className="flex"><span className="font-bold mr-2">一、</span><span>配合公司及組織需求規劃教育訓練課程並確保訓練績效。</span></div>
                <div className="flex"><span className="font-bold mr-2">二、</span><span>提升食品安全衛生意識、建立食品安全衛生文化。</span></div>
                <div className="flex"><span className="font-bold mr-2">三、</span><span>強化自我能力提升、落實基礎職能教育。</span></div>
                <div className="flex"><span className="font-bold mr-2">四、</span><span>鼓勵員工終身學習，提升個人的競爭優勢。</span></div>
              </div>

              <p className="font-bold text-gray-800 mt-8">並作以下承諾：</p>
              
              <div className="space-y-3 pl-2">
                <div className="flex"><span className="font-bold mr-2">一、</span><span>充分揭露年度訓練計畫與課程相關資訊，並依需求落實執行。</span></div>
                <div className="flex"><span className="font-bold mr-2">二、</span><span>外部訓練課程經核准公司將提供學費與差旅費。</span></div>
                <div className="flex"><span className="font-bold mr-2">三、</span><span>外部訓練課程若為休息日則另給補休一天。</span></div>
                <div className="flex"><span className="font-bold mr-2">四、</span><span>內部訓練課程經主管同意參訓視同上班。</span></div>
              </div>

              <div className="mt-12 pt-6 text-right border-t border-gray-100">
                <p className="font-bold text-gray-800 text-xl tracking-widest">總經理 宋宗龍 <span className="text-base font-normal ml-2">簽署發行</span></p>
              </div>
            </div>
          </div>
        );
      case 'overview':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">課程總覽與報名</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">快速報名</h3>
              <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">選擇課程</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    required
                  >
                    <option value="">請選擇...</option>
                    {courses.filter(c => c.status === 'active').map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.startDate})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">員工工號</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={regEmployeeId}
                    onChange={(e) => setRegEmployeeId(e.target.value)}
                    placeholder="例如: EMP001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">員工姓名</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={regEmployeeName}
                    onChange={(e) => setRegEmployeeName(e.target.value)}
                    placeholder="例如: 王小明"
                    required
                  />
                </div>
                <div>
                  <button type="submit" className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors">
                    送出報名
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.filter(c => c.status === 'active').map(course => (
                <div key={course.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-emerald-500">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{course.name}</h3>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">
                      {course.category}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mt-4">
                    <p><span className="font-semibold w-20 inline-block">日期：</span>{course.startDate} ~ {course.endDate}</p>
                    <p><span className="font-semibold w-20 inline-block">時間：</span>{course.time}</p>
                    <p><span className="font-semibold w-20 inline-block">地點：</span>{course.location}</p>
                    {course.link && (
                      <p className="flex items-center">
                        <span className="font-semibold w-20 inline-block">連結：</span>
                        <a href={course.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                          點擊前往 <ExternalLink size={14} className="ml-1" />
                        </a>
                      </p>
                    )}
                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <p className="font-semibold mb-1">課程說明：</p>
                      <p className="whitespace-pre-wrap">{course.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <button 
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center"
                    >
                      <CheckCircle size={16} className="mr-1" /> 我要報名
                    </button>
                  </div>
                </div>
              ))}
              {courses.filter(c => c.status === 'active').length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm">
                  目前沒有開放報名的課程
                </div>
              )}
            </div>
          </div>
        );
      case 'records':
        return (
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm flex flex-col" style={{ minHeight: '800px' }}>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">訓練紀錄查詢</h2>
            <div className="flex-1 w-full rounded-md overflow-hidden border border-gray-200">
              <iframe 
                src="https://lookerstudio.google.com/embed/reporting/d7c12a51-2aa9-4b9b-b670-a51eba58eaa4/page/NPwlF" 
                frameBorder="0" 
                style={{ border: 0 }} 
                allowFullScreen 
                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                className="w-full h-full min-h-[500px] md:min-h-[700px]"
                title="訓練紀錄查詢"
              ></iframe>
            </div>
          </div>
        );
      case 'registrations':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">報名清單查詢</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">報名日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">課程名稱</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工號</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.map(reg => {
                    const course = courses.find(c => c.id === reg.courseId);
                    return (
                      <tr key={reg.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.registrationDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course?.name || '未知課程'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.employeeId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.employeeName}</td>
                      </tr>
                    );
                  })}
                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">尚無報名紀錄</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'manage':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">新增課程</h2>
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程類別 <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.category}
                      onChange={(e) => setNewCourse({...newCourse, category: e.target.value as CourseCategory})}
                      required
                    >
                      <option value="外部實體">外部實體</option>
                      <option value="外部線上">外部線上</option>
                      <option value="內部實體">內部實體</option>
                      <option value="內部數位學習平台">內部數位學習平台</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程名稱 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.name || ''}
                      onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日期 <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.startDate || ''}
                      onChange={(e) => setNewCourse({...newCourse, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">結束日期 <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.endDate || ''}
                      onChange={(e) => setNewCourse({...newCourse, endDate: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程時間 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="例如: 14:00 - 16:00"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.time || ''}
                      onChange={(e) => setNewCourse({...newCourse, time: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程地點 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="實體地點或線上平台名稱"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.location || ''}
                      onChange={(e) => setNewCourse({...newCourse, location: e.target.value})}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程連結 (選填)</label>
                    <input 
                      type="url" 
                      placeholder="https://"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.link || ''}
                      onChange={(e) => setNewCourse({...newCourse, link: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程說明 <span className="text-red-500">*</span></label>
                    <textarea 
                      rows={4}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={newCourse.description || ''}
                      onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" className="bg-emerald-600 text-white py-2 px-6 rounded-md hover:bg-emerald-700 transition-colors flex items-center">
                    <PlusCircle size={18} className="mr-2" /> 新增課程
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">課程管理 (上下架)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">課程名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類別</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map(course => (
                      <tr key={course.id} className={course.status === 'inactive' ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${course.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {course.status === 'active' ? '上架中' : '已下架'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.startDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleToggleCourseStatus(course.id)}
                            className={`${course.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-emerald-600 hover:text-emerald-900'} flex items-center justify-end w-full`}
                          >
                            {course.status === 'active' ? (
                              <><XCircle size={16} className="mr-1" /> 下架</>
                            ) : (
                              <><CheckCircle size={16} className="mr-1" /> 重新上架</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-emerald-800 text-white p-4 flex justify-between items-center shadow-md z-20 relative">
        <div>
          <h1 className="text-xl font-bold tracking-wider flex items-center">
            奇美食品
            {!isConnected && <span className="ml-2 w-2 h-2 rounded-full bg-red-400 animate-pulse" title="連線中..."></span>}
          </h1>
          <p className="text-emerald-200 text-xs mt-1">教育訓練資訊平台</p>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 focus:outline-none hover:bg-emerald-700 rounded-md transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-emerald-800 text-white shadow-md flex-shrink-0 relative pb-20`}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-bold tracking-wider flex items-center">
            奇美食品
            {!isConnected && <span className="ml-2 w-2 h-2 rounded-full bg-red-400 animate-pulse" title="連線中..."></span>}
          </h1>
          <p className="text-emerald-200 text-sm mt-1">教育訓練資訊平台</p>
        </div>
        <nav className="mt-0 md:mt-2">
          <button 
            onClick={() => { setActiveTab('policy'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'policy' ? 'bg-emerald-900 border-l-4 border-emerald-400' : 'hover:bg-emerald-700 border-l-4 border-transparent'}`}
          >
            <BookOpen size={20} className="mr-3" />
            訓練政策
          </button>
          <button 
            onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'overview' ? 'bg-emerald-900 border-l-4 border-emerald-400' : 'hover:bg-emerald-700 border-l-4 border-transparent'}`}
          >
            <List size={20} className="mr-3" />
            課程總覽
          </button>
          <button 
            onClick={() => { setActiveTab('records'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'records' ? 'bg-emerald-900 border-l-4 border-emerald-400' : 'hover:bg-emerald-700 border-l-4 border-transparent'}`}
          >
            <History size={20} className="mr-3" />
            訓練紀錄查詢
          </button>
          <button 
            onClick={() => { setActiveTab('registrations'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'registrations' ? 'bg-emerald-900 border-l-4 border-emerald-400' : 'hover:bg-emerald-700 border-l-4 border-transparent'}`}
          >
            <ClipboardList size={20} className="mr-3" />
            報名清單查詢
          </button>
          <button 
            onClick={() => { setActiveTab('manage'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors ${activeTab === 'manage' ? 'bg-emerald-900 border-l-4 border-emerald-400' : 'hover:bg-emerald-700 border-l-4 border-transparent'}`}
          >
            <PlusCircle size={20} className="mr-3" />
            新增/管理課程
          </button>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-emerald-700">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm text-emerald-200 truncate pr-2">{user?.displayName || '使用者'}</span>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-emerald-700 rounded-md transition-colors text-emerald-100 hover:text-white"
              title="登出"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
