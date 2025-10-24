import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query,
  setLogLevel, 
  serverTimestamp, 
  deleteDoc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// ==========================================================
// Local Development Configuration (Must be replaced for local testing)
// NOTE: Your specific project keys should be configured here if running locally.
// ==========================================================
const localAppId = 'local-mindmap-app'; 
const localFirebaseConfig = { 
    apiKey: "AIzaSyB4D4JBE4gCm55Gau9UKcblZV8eSHEQcAg",
    authDomain: "minmap-eeedf.firebaseapp.com",
    projectId: "minmap-eeedf",
    storageBucket: "minmap-eeedf.firebasestorage.app",
    messagingSenderId: "521142906789",
    appId: "1:521142906789:web:35873986288c80eb89824c",
    measurementId: "G-6E294GFM1Y"
};
const localInitialAuthToken = null; 
// ==========================================================

// Environment Variable Handling: Use Canvas global variables if available.
const appId = typeof __app_id !== 'undefined' ? __app_id : localAppId;

let firebaseConfig = localFirebaseConfig;
try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    // Attempt to use configuration injected by the environment
    firebaseConfig = JSON.parse(__firebase_config);
  }
} catch (e) {
  console.error("Failed to parse __firebase_config:", e);
}
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : localInitialAuthToken;


// Icons using inline SVG
const PlusIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const TrashIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"/>
  </svg>
);

const SendIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
    </svg>
);


function App() {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [nodes, setNodes] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [message, setMessage] = useState('');

  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    setLogLevel('debug');
    
    // Initial validation check for API Key
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        setError("Firebase API Key가 유효하지 않거나 설정되지 않았습니다. Canvas 환경 변수 주입 실패 또는 로컬 설정 누락");
        setLoading(false);
        setIsAuthReady(true);
        return;
    }

    let app;
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase Initialization Failed:", e);
      setError(`Firebase 초기화 실패: ${e.message}`);
      setLoading(false);
      setIsAuthReady(true);
      return;
    }
    
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);

    setDb(firestore);

    // Authentication State Change Listener
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setMessage(`인증 성공: 사용자 ID ${user.uid.substring(0, 8)}...`);
        setIsAuthReady(true);
        setLoading(false);
      } else {
        try {
          let userCredential;
          if (initialAuthToken) {
            // Priority 1: Use injected custom token from Canvas environment
            userCredential = await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            // Fallback: Use Anonymous sign-in (requires Anonymous Auth to be enabled in Firebase Console)
            userCredential = await signInAnonymously(firebaseAuth);
          }
          setUserId(userCredential.user.uid);
          setMessage(`로그인 성공: 사용자 ID ${userCredential.user.uid.substring(0, 8)}...`);
        } catch (authError) {
          console.error("Firebase Auth Sign-In Failed:", authError);
          // Catch the specific error reported by the user
          setError(`인증 실패: ${authError.message}`); 
        } finally {
          setIsAuthReady(true);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Mindmap Nodes (Real-time)
  useEffect(() => {
    // Only proceed if DB is ready, auth is complete, and no configuration error exists
    if (!db || !isAuthReady || !userId || error) return;

    const nodesCollectionPath = `artifacts/${appId}/public/data/mindmap_nodes`;
    const nodesCollectionRef = collection(db, nodesCollectionPath);
    const q = query(nodesCollectionRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNodes = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawCreatedAt = data.createdAt;
        let timestampMillis;

        // Defensive logic to handle both Firestore Timestamp and JS Number (for old data)
        if (typeof rawCreatedAt === 'number') {
            timestampMillis = rawCreatedAt; 
        } else if (rawCreatedAt && typeof rawCreatedAt.toMillis === 'function') {
            timestampMillis = rawCreatedAt.toMillis();
        } else {
            timestampMillis = Date.now(); 
        }
        
        return {
          id: doc.id,
          ...data,
          createdAt: timestampMillis, 
        };
      });
      
      fetchedNodes.sort((a, b) => a.createdAt - b.createdAt);
      setNodes(fetchedNodes);
      setError(null);
    }, (err) => {
      console.error("Firestore Mindmap data load failed:", err);
      setError(`마인드맵 데이터 로드 중 오류가 발생했습니다: ${err.message}`);
    });

    return () => unsubscribe();
  }, [db, isAuthReady, userId, appId, error]);

  // 3. Load Chat Messages (Real-time)
  useEffect(() => {
    if (!db || !isAuthReady || !userId || error) return;

    const messagesCollectionPath = `artifacts/${appId}/public/data/chat_messages`;
    const messagesCollectionRef = collection(db, messagesCollectionPath);
    const q = query(messagesCollectionRef); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Local sorting by serverTimestamp (seconds)
      fetchedMessages.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeA - timeB;
      });

      setMessages(fetchedMessages);
    }, (err) => {
      console.error("Firestore Chat data load failed:", err);
    });

    return () => unsubscribe();
  }, [db, isAuthReady, userId, appId, error]);


  // CRUD: Node Creation
  const createNode = useCallback(async (parentId, text) => {
    if (!db || !userId || error) {
        console.error("Database, User ID, or Error state prevents node creation.");
        return;
    }
    const nodesCollectionPath = `artifacts/${appId}/public/data/mindmap_nodes`;
    const newNode = {
      parentId: parentId,
      text: text || '새 노드',
      userId: userId,
      // Use serverTimestamp for synchronized creation time
      createdAt: serverTimestamp(), 
    };
    try {
      const docRef = doc(collection(db, nodesCollectionPath), uuidv4()); 
      await setDoc(docRef, newNode);
      setMessage(`노드 '${newNode.text.substring(0, 15)}...' 추가 성공.`);
    } catch (e) {
      console.error("노드 추가 실패:", e);
      setError("노드 추가에 실패했습니다.");
    }
  }, [db, userId, appId, error]);

  // CRUD: Node Update
  const updateNodeText = useCallback(async (nodeId, newText) => {
    if (!db || error) return;
    const nodesCollectionPath = `artifacts/${appId}/public/data/mindmap_nodes`;
    const docRef = doc(db, nodesCollectionPath, nodeId);
    try {
      await setDoc(docRef, { text: newText }, { merge: true });
    } catch (e) {
      console.error("노드 업데이트 실패:", e);
      setError("노드 업데이트에 실패했습니다.");
    }
  }, [db, appId, error]);

  // CRUD: Node Deletion
  const deleteNode = useCallback(async (nodeId) => {
    if (!db || error) return;
    const nodesCollectionPath = `artifacts/${appId}/public/data/mindmap_nodes`;
    const docRef = doc(db, nodesCollectionPath, nodeId);
    try {
      await deleteDoc(docRef); 
      setMessage(`노드 '${nodeId.substring(0, 4)}...' 삭제 성공.`);
    } catch (e) {
      console.error("노드 삭제 실패:", e);
      setError("노드 삭제에 실패했습니다.");
    }
  }, [db, appId, error]);

  // CRUD: Send Chat Message
  const sendMessage = useCallback(async (text) => {
    if (!db || !userId || error || !text.trim()) return;
    const messagesCollectionPath = `artifacts/${appId}/public/data/chat_messages`;
    const newMessage = {
      text: text.trim(),
      userId: userId,
      createdAt: serverTimestamp(),
    };
    try {
      const docRef = doc(collection(db, messagesCollectionPath)); 
      await setDoc(docRef, newMessage);
    } catch (e) {
      console.error("메시지 전송 실패:", e);
      setError("메시지 전송에 실패했습니다.");
    }
  }, [db, userId, appId, error]);


  // Node Component
  const NodeItem = ({ node }) => {
    const isRoot = node.parentId === 'ROOT';
    
    // Text change handler
    const handleTextChange = (e) => {
      updateNodeText(node.id, e.target.value);
    };

    // Handle Enter key to blur (trigger update)
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur(); 
      }
    };

    return (
      <div 
        className={`flex items-center group mb-2 p-3 rounded-lg shadow-md transition-all duration-200 
          ${isRoot ? 'bg-indigo-600 text-white font-bold text-lg' : 'bg-white hover:bg-indigo-50 border border-indigo-200'}
          ${node.userId === userId ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}
        `}
      >
        <input
          type="text"
          value={node.text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          className={`flex-grow w-full bg-transparent focus:outline-none 
            ${isRoot ? 'text-white placeholder-white' : 'text-gray-800'}
          `}
          placeholder={isRoot ? '마인드맵 주제' : '노드 내용'}
          // Only the owner can edit the node
          disabled={!isAuthReady || node.userId !== userId || !!error} 
        />
        
        {/* Actions (Add/Delete) shown only to the owner */}
        {node.userId === userId && isAuthReady && !error && (
          <div className="flex space-x-2 ml-4">
            <button 
              onClick={() => createNode(node.id, `새 자식 노드 (${node.text})`)}
              className="p-1 text-indigo-500 hover:text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-full transition-colors duration-150 shadow-sm"
              title="자식 노드 추가"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            {/* Root node cannot be deleted */}
            {!isRoot && (
              <button 
                onClick={() => deleteNode(node.id)}
                className="p-1 text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 rounded-full transition-colors duration-150 shadow-sm"
                title="노드 삭제"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Renders nodes hierarchically
  const renderNodes = (parentId, depth = 0) => {
    const children = nodes.filter(node => node.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className={`relative ${depth > 0 ? 'pl-6 border-l border-indigo-300 ml-3' : ''}`}>
        {children.map(node => (
          <div key={node.id} className="mt-2">
            <NodeItem node={node} />
            {renderNodes(node.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  // Chat Panel Component
  const ChatPanel = () => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // Auto-scroll to the bottom when messages update
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input);
            setInput('');
        }
    };

    // Format timestamp for display
    const formatTimestamp = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return '...';
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-[400px] bg-gray-50 rounded-xl shadow-inner mt-6">
            <div className="p-3 bg-indigo-100 text-indigo-800 font-semibold rounded-t-xl">
                실시간 채팅 ({messages.length} 메시지)
            </div>
            {/* Message Display Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {messages.map((msg, index) => {
                    const isMe = msg.userId === userId;
                    const displayUserId = msg.userId || 'Unknown'; // Show full ID
                    
                    return (
                        <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md ${isMe ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'}`}>
                                <div className={`text-xs font-bold mb-1 ${isMe ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                    {isMe ? '나' : `사용자 ${displayUserId}`}
                                </div>
                                <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                <div className={`mt-1 text-right text-xs ${isMe ? 'text-indigo-300' : 'text-gray-400'}`}>
                                    {formatTimestamp(msg.createdAt)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input Form */}
            <form onSubmit={handleSend} className="p-4 border-t bg-white flex sticky bottom-0 rounded-b-xl">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={error ? "채팅을 보낼 수 없습니다. 오류를 해결하세요." : "메시지를 입력하세요..."}
                    className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    disabled={!isAuthReady || !!error || loading}
                />
                <button
                    type="submit"
                    className="bg-indigo-600 text-white p-3 rounded-r-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center disabled:bg-indigo-300"
                    disabled={!isAuthReady || !!error || loading || !input.trim()}
                    title="전송"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
  };
  
  // Find or Create Root Node
  const rootNode = nodes.find(node => node.parentId === 'ROOT');
  
  // Create initial root node if none exists
  useEffect(() => {
    if (isAuthReady && !loading && nodes.length === 0 && !rootNode && !error) {
      console.log("Creating initial root node...");
      createNode('ROOT', '마인드맵 핵심 주제');
    }
  }, [isAuthReady, loading, nodes.length, rootNode, error, createNode]);


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-2">
          실시간 협업 마인드맵 & 채팅 (Firestore)
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          앱 ID: <span className="font-mono text-xs text-indigo-600">{appId}</span> | 
          사용자 ID: <span className="font-mono text-xs text-indigo-600">{userId || 'Loading...'}</span>
        </p>

        {/* Status Message and Error Display */}
        <div className={`p-3 text-sm rounded-lg mb-4 ${error ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {error ? `오류: ${error}` : (loading ? '인증 및 데이터 로드 중...' : message)}
        </div>

        {/* Main Mindmap Area */}
        <div className="bg-white p-6 rounded-xl shadow-2xl min-h-[400px]">
          {loading && !error && (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="ml-4 text-gray-600">인증 및 데이터 로드 중...</p>
            </div>
          )}
          
          {!loading && !error && (
            <>
              {rootNode ? (
                // Render root node and start recursive rendering
                <div className="mindmap-container">
                  <NodeItem node={rootNode} />
                  <div className="mt-4">
                    {renderNodes(rootNode.id)}
                  </div>
                </div>
              ) : (
                <div className="text-center p-10 text-gray-500">
                  {nodes.length === 0 ? "첫 번째 노드를 생성 중입니다..." : "루트 노드를 찾을 수 없습니다."}
                </div>
              )}
            </>
          )}

          {/* All Nodes List (Debugging/State Check) */}
          {nodes.length > 0 && (
            <div className="mt-8 pt-4 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">마인드맵 데이터 상태</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {nodes.map(node => (
                      <div key={node.id} className={`p-2 rounded-md ${node.userId === userId ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-100 border-gray-300'} border`}>
                          <p>ID: {node.id}</p>
                          <p>부모: {node.parentId}</p>
                          <p>내용: <span className="font-bold">{node.text}</span></p>
                          <p>소유자: {node.userId}</p>
                      </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Chat Panel */}
        {!error && <ChatPanel />}
        
        {/* Detailed Error Message */}
        {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg text-red-700 border border-red-300">
                <h3 className="font-bold">🚨 초기화 실패 상세 정보:</h3>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2">
                    이 오류 (`auth/configuration-not-found`)는 Firebase 프로젝트 콘솔에서 **Authentication (인증) 서비스가 활성화되지 않았음**을 나타냅니다. 
                    특히 **'Anonymous (익명) 인증'**을 활성화했는지 확인해 주세요. 이 단계를 완료한 후 **Preview를 다시 시작**하면 오류가 사라질 것입니다.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
