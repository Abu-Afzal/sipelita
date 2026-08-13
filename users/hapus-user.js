import { db } from '../js/firebase-config.js';
import {
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.hapusUser = async function(email){

    const konfirmasi = confirm(
        'Yakin ingin menghapus user ini?'
    );

    if(!konfirmasi) return;

    try{

        await deleteDoc(
            doc(db, 'users', email)
        );

        alert('✅ User berhasil dihapus');

        window.loadUsers();

    }catch(err){

        console.error(err);

        alert(err.message);

    }

}
