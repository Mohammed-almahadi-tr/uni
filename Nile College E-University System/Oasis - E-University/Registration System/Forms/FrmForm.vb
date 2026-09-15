Imports System.Data.SqlClient
Imports EgyCurr

Public Class FrmForm
    Public FileNo, FileNo1 As Integer
    Public dat As DateTime = Now
    Public dat1 As DateTime
    Sub ValidColeg()
        Try
            Me.Cursor = Cursors.WaitCursor
            'Dim cmd1 As New SqlCommand("Select StdColg From StdData Where " & _
            '                   " StdId=N'" & Me.txtUniversityID.Text & "' ", cnn2)
            Dim cmd As New SqlCommand("select StdColg from StdData where StdId=@StdId and StdId is not null", cnn)
            Dim reader As SqlDataReader
            cnn.Open()
            cmd.Parameters.AddWithValue("@StdId", Me.txtUniversityID.Text)
            reader = cmd.ExecuteReader

            While reader.Read
          
                STDColeg = reader.Item("StdColg")

                Me.Cursor = Cursors.Default
            End While
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub ValidateUniversityID()
        Try
            Dim cmd As New SqlCommand("Select Count(*) From StdData Where " & _
                                      " StdId=N'" & Me.txtUniversityID.Text & "' ", cnn1)
            Dim X As Boolean

            cnn1.Open()
            X = CBool(cmd.ExecuteScalar.ToString)
            cnn1.Close()

            If X = False Then
                MsgBox("الرقم الجامعي غير صحيح", , "الادارة")

            End If


        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub FillStdData()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("select * from StdData where StdId=@StdId and StdId is not null", cnn)
            Dim reader As SqlDataReader
            Me.TxtForAr.Clear()
            Me.TxtFAR.Clear()
            Me.TxtTHAr.Clear()
            Me.TxtSAr.Clear()
            Me.TxtSchool.Clear()
            Me.CombProgram.SelectedIndex = -1
            Me.CombColeg.SelectedIndex = -1

            cnn.Open()
            cmd.Parameters.AddWithValue("@StdId", Me.txtUniversityID.Text)
            reader = cmd.ExecuteReader
            Dim aa, bb As Integer
            While reader.Read
                Me.TxtFAR.Text = reader.Item("StdFirName")
                Me.TxtTHAr.Text = reader.Item("StdTheName")
                Me.TxtSAr.Text = reader.Item("StdSecName")
                Me.TxtForAr.Text = reader.Item("StdForName")
                Me.TxtSchool.Text = reader.Item("StdSchool")
                Me.CombColeg.Text = reader.Item("StdColg")
                Me.CombProgram.Text = reader.Item("StdProgram")
                Me.TxtNatioNo.Text = reader.Item("NNumber")
                aa = reader.Item("TypeAd")
                If aa = 0 Then
                    Me.CmbAdmiTyp.Text = "قبول عام"
                End If
                If aa = 1 Then
                    Me.CmbAdmiTyp.Text = "قبول خاص"
                End If
                If aa = 2 Then
                    Me.CmbAdmiTyp.Text = "ابناء عاملين"
                End If
                If aa = 3 Then
                    Me.CmbAdmiTyp.Text = "وافدين"
                End If
                Me.TxtYear.Text = reader.Item("Year")
                bb = reader.Item("Type")
                If bb = 0 Then
                    Me.TxtType.Text = "دبلوم"
                Else
                    Me.TxtType.Text = "بكلاريوس"
                End If
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub


    Sub FillPrograms()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("select Distinct ProgramName From Programs where ProgramName is not null ", cnn)
            Dim Reader As SqlDataReader

            Me.CombProgram.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader

            While Reader.Read
                Me.CombProgram.Items.Add(Reader.Item(0))
            End While

            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub
    Public Sub print(ByVal id As Integer)
        Try
            'Dim dap As New SqlDataAdapter("select * from StdForm Where UnivID='" & FileNo & "'", cnn)
            Dim dap As New SqlDataAdapter("select * from StdForm Where UnivID=N'" & Me.txtUniversityID.Text & "'", cnn)

            Dim das As New DataSet1
            Dim dt As New DataTable
            dap.Fill(dt)
            ' dap.Fill(das, "Result")
            Dim rpt As New StudenForm
            'rpt.SetDataSource(das.Tables("Result"))
            rpt.SetDataSource(dt)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub Clear()
        Me.TxtFAR.Clear()
        Me.TxtSAr.Clear()
        Me.TxtTHAr.Clear()
        Me.TxtForAr.Clear()
        Me.TxtFirEngName.Clear()
        Me.TxtSeEngName.Clear()
        Me.TxtThEngName.Clear()
        Me.TxtFoEnName.Clear()
        Me.CmbAdmiTyp.SelectedItem = Nothing
        Me.CombColeg.SelectedItem = Nothing
        Me.CombProgram.SelectedItem = Nothing
        Me.CombTypeofCer.SelectedItem = Nothing
        Me.txtUniversityID.Clear()
        Me.txtPlaceofBirth.Clear()
        Me.DTPBirthDate.Value = Now
        Me.txtParent.Clear()
        Me.txtParentJob.Clear()
        Me.txtRelevant.Clear()
        Me.txtParentAddress.Clear()
        Me.txtParentPhone.Clear()
        Me.TxtPhoneNo.Clear()
        Me.txtAddress.Clear()
        Me.TxtNatioNo.Clear()
        Me.CombDyana.SelectedItem = Nothing
        Me.RadFmail.Checked = False
        Me.RadMail.Checked = True
        Me.CombStatus.SelectedItem = Nothing
        Me.CombNationality.SelectedItem = Nothing
        Me.TxtEmail.Clear()
        'Me.CombBold.SelectedItem = Nothing
        Me.CheckBox1.Checked = False
    End Sub
    Sub loadssss()
        FAR = Me.TxtFAR.Text
        SAr = Me.TxtSAr.Text
        THAr = Me.TxtTHAr.Text
        ForAr = Me.TxtForAr.Text
        FirEngName = Me.TxtFirEngName.Text
        SeEngName = Me.TxtSeEngName.Text
        ThEngName = Me.TxtThEngName.Text
        FoEnName = Me.TxtFoEnName.Text
        TypeAD = Me.CmbAdmiTyp.Text
        Year = Me.TxtYear.Text
        Coleg = Me.CombColeg.Text
        type = Me.TxtType.Text
        Program = Me.CombProgram.Text
        TypeofCe = Me.CombTypeofCer.Text
        UniversityID = Me.txtUniversityID.Text
        PlaceofBirth = Me.txtPlaceofBirth.Text
        dat = Me.DTPBirthDate.Value
        Parent0 = Me.txtParent.Text
        ParentJob = Me.txtParentJob.Text
        Relevant = Me.txtRelevant.Text
        ParentAddress = Me.txtParentAddress.Text
        ParentPhone = Me.txtParentPhone.Text
        PhoneNo = Me.TxtPhoneNo.Text
        Address = Me.txtAddress.Text
        NatioNo = Me.TxtNatioNo.Text
        Dyana = Me.CombDyana.Text
        Email = Me.TxtEmail.Text
        Status = Me.CombStatus.Text
        Nationality = Me.CombNationality.Text
        school = Me.TxtSchool.Text
        If Me.RadFmail.Checked = True Then
            Gender = 1
        Else
            Gender = 0
        End If

        Me.CombStatus.Text = Status
        Me.CombNationality.Text = Nationality
        Me.TxtEmail.Text = Email
    End Sub
    Private Sub Button1_Click(sender As System.Object, e As System.EventArgs) Handles BtnSave.Click
        loadssss()
        Me.Hide()
        FrmStudForm2.Show()
        'Me.ErrProForm.Clear()
        'If Me.TxtFAR.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtFAR, "الرجاءادخال الاسم العربي الاول")
        '    Exit Sub
        'ElseIf Me.TxtSAr.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtSAr, "الرجاءادخال الاسم العربي الثاني")
        '    Exit Sub
        'ElseIf Me.TxtTHAr.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtTHAr, "الرجاءادخال الاسم العربي الثالث")
        '    Exit Sub
        'ElseIf Me.TxtFAR.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtFAR, "الرجاءادخال الاسم العربي الرابع")
        '    '    Exit Sub
        'ElseIf Me.TxtFirEngName.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtFirEngName, "الرجاءادخال الاسم الانجليزي الاول")
        '    Exit Sub
        'ElseIf Me.TxtSeEngName.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtSeEngName, "الرجاءادخال الاسم الانجليزي الثاني")
        '    Exit Sub
        'ElseIf Me.TxtThEngName.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtThEngName, "الرجاءادخال الاسم الانجليزي الثالث")
        '    Exit Sub
        'ElseIf Me.TxtFoEnName.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtFoEnName, "الرجاءادخال الاسم الانجليزي الرابع")
        '    Exit Sub
        '    'ElseIf Me.CombColeg.SelectedIndex = -1 Then
        '    '    Me.ErrProForm.SetError(Me.CombColeg, "الرجاء تحديد الكلية")
        '    '    Exit Sub
        '    'ElseIf Me.CombProgram.SelectedIndex = -1 Then
        '    '    Me.ErrProForm.SetError(Me.CombProgram, "الرجاء تحديد البرنامج")
        '    '    Exit Sub
        'ElseIf Me.CombTypeofCer.SelectedIndex = -1 Then
        '    Me.ErrProForm.SetError(Me.CombTypeofCer, "الرجاء تحديد نوع الشهادة")
        '    Exit Sub
        'ElseIf Me.txtPlaceofBirth.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtPlaceofBirth, "الرجاءادخال مكان الميلاد")
        '    Exit Sub
        'ElseIf Me.DTPBirthDate.Value = Now Then
        '    Me.ErrProForm.SetError(Me.DTPBirthDate, "الرجاءمراجعة تاريخ الميلاد")
        '    Exit Sub
        'ElseIf Me.txtUniversityID.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtUniversityID, "الرجاءادخال الرقم الجامعي")
        '    Exit Sub
        'ElseIf Me.CombNationality.SelectedIndex = -1 Then
        '    Me.ErrProForm.SetError(Me.CombNationality, "الرجاء تحديد الجنسية")
        '    Exit Sub
        'ElseIf Me.txtParent.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtParent, "الرجاءادخال اسم ولي الامر ")
        '    Exit Sub
        'ElseIf Me.txtParentJob.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtParentJob, "الرجاءادخال مهنة ولي الامر ")
        '    Exit Sub
        'ElseIf Me.txtParentPhone.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtParentPhone, "الرجاءادخال هاتف ولي الامر ")
        '    Exit Sub
        'ElseIf Me.txtParentAddress.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtParentAddress, "الرجاءادخال عنوان ولي الامر ")
        '    Exit Sub
        'ElseIf Me.txtRelevant.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtRelevant, "الرجاءادخال صلة القرابة بولي الامر ")
        '    Exit Sub
        'ElseIf Me.TxtPhoneNo.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtPhoneNo, "الرجاءادخال رقم الهاتف ")
        '    Exit Sub
        'ElseIf Me.txtAddress.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.txtAddress, "الرجاءادخال العنوان الحالي ")
        '    Exit Sub
        'ElseIf Me.TxtNatioNo.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtNatioNo, "الرجاءادخال الرقم الوطني ")
        '    Exit Sub
        'ElseIf Me.CombDyana.SelectedIndex = -1 Then
        '    Me.ErrProForm.SetError(Me.CombDyana, "الرجاء تحديد الديانة")
        '    Exit Sub
        'ElseIf Me.TxtEmail.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtEmail, "الرجاءادخال البريد الالكتروني ")
        '    Exit Sub
        'ElseIf Me.CombStatus.SelectedIndex = -1 Then
        '    Me.ErrProForm.SetError(Me.CombStatus, "الرجاء تحديد الحالة الاجتماعية")
        '    Exit Sub
        '    'ElseIf Me.CombBold.SelectedIndex = -1 Then
        '    '    Me.ErrProForm.SetError(Me.CombBold, "الرجاء تحديد فصيلة الدم")
        '    '    Exit Sub
        'Else

        '    Try
        '        Me.Cursor = Cursors.WaitCursor
        '        Dim cmd As New SqlCommand()
        '        Dim Trans As SqlTransaction
        '        cnn.Open()
        '        cmd.Connection = cnn
        '        Trans = cnn.BeginTransaction
        '        cmd.Transaction = Trans
        '        cmd.CommandText = "Select IsNull(Max(FileNo),0) from StdForm"

        '        FileNo1 = CInt(cmd.ExecuteScalar)
        '        FileNo = FileNo1 + 1
        '        If FileNo = 1 Or 0 Then
        '            dat = Now
        '        Else
        '            cmd.CommandText = "Select RegDate from StdForm Where  FileNo='" & FileNo1 & "'"
        '            ' cmd.CommandText = "Select MAX(RegDate) from StdForm Where Coleg=@Coleg and FileNo='" & FileNo1 & "'"
        '            dat1 = CDate(cmd.ExecuteScalar)
        '            dat = dat1.AddMinutes(10)
        '            'If dat.Hour = 3 Then
        '            '    dat = dat.AddDays(1)
        '            'End If
        '        End If
        '        cmd.CommandText = "Insert Into StdForm (FileNo,RegDate,UnivID,StdFiNaA,StdSNaA,StdThNaA,StdFoNaA,StdFiNaE,StdSNaE,StdThNaE,StdFoNaE,TypeofAdmission,Coleg,Program,TypeofCertificate,PlaceofBirth,BirthDate,Nationality,Parent,JobofParent,Relevant,ParentAddress,ParentPhone,StudentPhoneNo,StudentAddress,NatioNo,Dyana,Email,type,status,SavedUser)" & _
        '                                        " Values (@FileNo,@RegDate,@UnivID,@StdFiNaA,@StdSNaA,@StdThNaA,@StdFoNaA,@StdFiNaE,@StdSNaE,@StdThNaE,@StdFoNaE,@TypeofAdmission,@Coleg,@Program,@TypeofCertificate,@PlaceofBirth,@BirthDate,@Nationality,@Parent,@JobofParent,@Relevant,@ParentAddress,@ParentPhone,@StudentPhoneNo,@StudentAddress,@NatioNo,@Dyana,@Email,@type,@status,@SavedUser) Select Scope_Identity()"

        '        'Add values
        '        cmd.Parameters.Clear()
        '        cmd.Parameters.AddWithValue("@FileNo", FileNo)
        '        cmd.Parameters.AddWithValue("@RegDate", dat)
        '        cmd.Parameters.AddWithValue("@UnivID", Me.txtUniversityID.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdFiNaA", Me.TxtFAR.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdSNaA", Me.TxtSAr.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdThNaA", Me.TxtTHAr.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdFoNaA", Me.TxtForAr.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdFiNaE", Me.TxtFirEngName.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdSNaE", Me.TxtSeEngName.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdThNaE", Me.TxtThEngName.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StdFoNaE", Me.TxtFoEnName.Text.Trim)
        '        cmd.Parameters.AddWithValue("@TypeofAdmission", Me.CmbAdmiTyp.SelectedItem)
        '        cmd.Parameters.AddWithValue("@Coleg", Me.CombColeg.Text)
        '        cmd.Parameters.AddWithValue("@Program", Me.CombProgram.Text)
        '        cmd.Parameters.AddWithValue("@TypeofCertificate", Me.CombTypeofCer.SelectedItem)
        '        cmd.Parameters.AddWithValue("@PlaceofBirth", Me.txtPlaceofBirth.Text.Trim)
        '        cmd.Parameters.AddWithValue("@BirthDate", Me.DTPBirthDate.Value)
        '        cmd.Parameters.AddWithValue("@Nationality", Me.CombNationality.SelectedItem)
        '        cmd.Parameters.AddWithValue("@Parent", Me.txtParent.Text.Trim)
        '        cmd.Parameters.AddWithValue("@JobofParent", Me.txtParentJob.Text.Trim)
        '        cmd.Parameters.AddWithValue("@Relevant", Me.txtRelevant.Text.Trim)
        '        cmd.Parameters.AddWithValue("@ParentAddress", Me.txtParentAddress.Text.Trim)
        '        cmd.Parameters.AddWithValue("@ParentPhone", Me.txtParentPhone.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StudentPhoneNo", Me.TxtPhoneNo.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StudentAddress", Me.txtAddress.Text.Trim)
        '        cmd.Parameters.AddWithValue("@NatioNo", Me.TxtNatioNo.Text.Trim)
        '        cmd.Parameters.AddWithValue("@Dyana", Me.CombDyana.Text)
        '        cmd.Parameters.AddWithValue("@Email", Me.TxtEmail.Text.Trim)
        '        If RadMail.Checked = True Then
        '            cmd.Parameters.AddWithValue("@type", CInt(0))
        '        Else
        '            cmd.Parameters.AddWithValue("@type", CInt(1))
        '        End If
        '        cmd.Parameters.AddWithValue("@status", Me.CombStatus.SelectedItem)
        '        ' cmd.Parameters.AddWithValue("@Bold", Me.CombBold.SelectedItem)
        '        cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
        '        cmd.ExecuteNonQuery()
        '        Trans.Commit()
        '        cnn.Close()
        '        'cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
        '        MsgBox("تم الحفظ")
        '        'SNo = Me.txtUniversityID.Text
        '        print(FileNo)
        '        Clear()

        '        Me.Cursor = Cursors.Default
        '    Catch ex As Exception
        '        Me.Cursor = Cursors.Default
        '        If cnn.State = ConnectionState.Open Then
        '            cnn.Close()
        '        End If
        '        MsgBox(ex.ToString)
        '    End Try
        'End If
    End Sub

    Private Sub FrmForm_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        Me.WindowState = FormWindowState.Maximized
        Me.BtnSave.Enabled = False
        'Me.TxtFAR.ForeColor = Color.Silver
        'Me.TxtFAR.Text = "الاسم الاول"
        'Me.TxtSAr.Text = "الاسم الثاني"
        'Me.TxtTHAr.Text = "الاسم الثالث"
        'Me.TxtForAr.Text = "الاسم الرابع"
        Me.TxtFirEngName.Text = "Fir Name"
        Me.TxtSeEngName.Text = "sec name"
        Me.TxtThEngName.Text = "Th neme"
        Me.TxtFoEnName.Text = "For Name"
    End Sub

    Private Sub BtnClose_Click(sender As System.Object, e As System.EventArgs) Handles BtnClose.Click
        Me.Close()
    End Sub


    Private Sub TxtFAR_Click(sender As System.Object, e As System.EventArgs)
        'Me.TxtFAR.ForeColor = Color.Black
        'Me.TxtFAR.Text = FontStyle.Regular
        'Me.TxtFAR.Clear()

    End Sub

    Private Sub TxtSAr_Click(sender As System.Object, e As System.EventArgs)
        'Me.TxtSAr.ForeColor = Color.Black
        'Me.TxtSAr.Text = FontStyle.Regular
        'Me.TxtSAr.Clear()
    End Sub

    Private Sub TxtTHAr_Click(sender As System.Object, e As System.EventArgs)
        'Me.TxtTHAr.ForeColor = Color.Black
        'Me.TxtTHAr.Text = FontStyle.Regular
        'Me.TxtTHAr.Clear()
    End Sub

    Private Sub TxtForAr_Click(sender As System.Object, e As System.EventArgs)
        'Me.TxtForAr.ForeColor = Color.Black
        'Me.TxtForAr.Text = FontStyle.Regular
        'Me.TxtForAr.Clear()
    End Sub

    Private Sub CheckBox1_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles CheckBox1.CheckedChanged
        Me.ErrProForm.Clear()

        If CheckBox1.Checked = False Then
            Me.BtnSave.Enabled = False
        End If
        'If Me.TxtFAR.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtFAR, "الرجاءادخال الاسم العربي الاول")
        '    Exit Sub
        'ElseIf Me.TxtSAr.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtSAr, "الرجاءادخال الاسم العربي الثاني")
        '    Exit Sub
        'ElseIf Me.TxtTHAr.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtTHAr, "الرجاءادخال الاسم العربي الثالث")
        '    Exit Sub
        'ElseIf Me.TxtFAR.Text.Trim.Length = 0 Then
        '    Me.ErrProForm.SetError(Me.TxtFAR, "الرجاءادخال الاسم العربي الرابع")
        '    Exit Sub
        If Me.TxtFirEngName.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtFirEngName, "الرجاءادخال الاسم الانجليزي الاول")
            Exit Sub
        ElseIf Me.TxtSeEngName.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtSeEngName, "الرجاءادخال الاسم الانجليزي الثاني")
            Exit Sub
        ElseIf Me.TxtThEngName.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtThEngName, "الرجاءادخال الاسم الانجليزي الثالث")
            Exit Sub
        ElseIf Me.TxtFoEnName.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtFoEnName, "الرجاءادخال الاسم الانجليزي الرابع")
            Exit Sub

        ElseIf Me.CombTypeofCer.SelectedIndex = -1 Then
            Me.ErrProForm.SetError(Me.CombTypeofCer, "الرجاء تحديد نوع الشهادة")
            Exit Sub
        ElseIf Me.CombNationality.SelectedIndex = -1 Then
            Me.ErrProForm.SetError(Me.CombNationality, "الرجاء تحديد الجنسية")
            Exit Sub
            'ElseIf Me.TxtEmail.Text.Trim.Length = 0 Then
            '    Me.ErrProForm.SetError(Me.TxtEmail, "الرجاءادخال البريد الالكتروني ")
            '    Exit Sub
            'ElseIf Me.TxtEmail.Text.Trim.Length = 0 OrElse Me.TxtEmail.Text.Trim.Length > 0 And _
            'Not System.Text.RegularExpressions.Regex.IsMatch(Me.TxtEmail.Text.Trim, "^[a-zA-Z][\w\.-]*[a-zA-Z0-9]@[a-zA-Z0-9][\w\.-]*[a-zA-Z0-9]\.[a-zA-Z][a-zA-Z\.]*[a-zA-Z]$") Then
            '    ErrProForm.SetError(Me.TxtEmail, "بريد الالكتروني  خاطئ")
            '    Exit Sub
        ElseIf Me.txtPlaceofBirth.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtPlaceofBirth, "الرجاءادخال مكان الميلاد")
            Exit Sub
        ElseIf Me.DTPBirthDate.Value = Now Then
            Me.ErrProForm.SetError(Me.DTPBirthDate, "الرجاءمراجعة تاريخ الميلاد")
            Exit Sub
        ElseIf Me.TxtNatioNo.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtNatioNo, "الرجاءادخال الرقم الوطني ")
            Exit Sub
        ElseIf IsNumeric(Me.TxtNatioNo.Text) = False Then
            ErrProForm.SetError(Me.TxtNatioNo, "الرقم الوطني خاطئ")
            Exit Sub
        ElseIf Me.txtParentPhone.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParentPhone, "الرجاءادخال هاتف ولي الامر ")
            Exit Sub
        ElseIf IsNumeric(Me.txtParentPhone.Text) = False Then
            ErrProForm.SetError(Me.txtParentPhone, "الرقم الهاتف خاطئ")
            Exit Sub
            'ElseIf Me.txtUniversityID.Text.Trim.Length = 0 Then
            '    Me.ErrProForm.SetError(Me.txtUniversityID, "الرجاءادخال الرقم الجامعي")
            '    Exit Sub
            'ElseIf IsNumeric(Me.txtUniversityID.Text) = False Then
            '    ErrProForm.SetError(Me.txtUniversityID, "الرقم الجامعي خاطئ")
            '    Exit Sub

        ElseIf Me.txtParent.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParent, "الرجاءادخال اسم ولي الامر ")
            Exit Sub
        ElseIf Me.txtParentJob.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParentJob, "الرجاءادخال مهنة ولي الامر ")
            Exit Sub

        ElseIf Me.txtParentAddress.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParentAddress, "الرجاءادخال عنوان ولي الامر ")
            Exit Sub
        ElseIf Me.txtRelevant.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtRelevant, "الرجاءادخال صلة القرابة بولي الامر ")
            Exit Sub
        ElseIf Me.txtAddress.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtAddress, "الرجاءادخال العنوان الحالي ")
            Exit Sub
        ElseIf Me.TxtPhoneNo.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtPhoneNo, "الرجاءادخال رقم الهاتف ")
            Exit Sub
        ElseIf IsNumeric(Me.TxtPhoneNo.Text) = False Then
            ErrProForm.SetError(Me.TxtPhoneNo, "رقم هاتف خاطئ")
            Exit Sub



        ElseIf Me.CombDyana.SelectedIndex = -1 Then
            Me.ErrProForm.SetError(Me.CombDyana, "الرجاء تحديد الديانة")
            Exit Sub

        ElseIf Me.CombStatus.SelectedIndex = -1 Then
            Me.ErrProForm.SetError(Me.CombStatus, "الرجاء تحديد الحالة الاجتماعية")
            Exit Sub
        Else
            Me.Label3.Visible = True
            Me.Label24.Visible = True
            Label3.Text = Me.TxtFAR.Text + "  " + Me.TxtForAr.Text
            Me.BtnSave.Enabled = True
        End If
    End Sub

    Private Sub Button1_Click_2(sender As System.Object, e As System.EventArgs) Handles Button1.Click
        Me.ErrProForm.Clear()
        If Me.txtUniversityID.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtUniversityID, "الرجاءادخال الرقم الجامعي")
            Exit Sub
        ElseIf IsNumeric(Me.txtUniversityID.Text) = False Then
            ErrProForm.SetError(Me.txtUniversityID, "الرقم الجامعي خاطئ")
            Exit Sub
            'ElseIf Me.CmbAdmiTyp.Text = "خاص" Then
            '    ValidColeg()

            '    'MsgBox("التسجيل للتقديم الخاص لم يفتح بعد", , "الادارة")
            'ElseIf STDColeg <> "الدراسـات التجـارية " Then
            '    MsgBox(STDColeg)

            'ElseIf STDColeg <> "علوم التمريض" Then
            '    MsgBox("التسجيل فقط لكليتي علوم التمريض والدراسـات التجـارية", , "الادارة")

        Else

            ValidateUniversityID()
            FillStdData()
        End If
    End Sub

    Private Sub TxtFoEnName_Click_1(sender As System.Object, e As System.EventArgs) Handles TxtFoEnName.Click
        Me.TxtFoEnName.ForeColor = Color.Black
        Me.TxtFoEnName.Text = FontStyle.Regular
        Me.TxtFoEnName.Clear()
    End Sub

    Private Sub TxtSeEngName_Click(sender As System.Object, e As System.EventArgs) Handles TxtSeEngName.Click
        Me.TxtSeEngName.ForeColor = Color.Black
        Me.TxtSeEngName.Text = FontStyle.Regular
        Me.TxtSeEngName.Clear()
    End Sub

    Private Sub TxtThEngName_Click(sender As System.Object, e As System.EventArgs) Handles TxtThEngName.Click
        Me.TxtThEngName.ForeColor = Color.Black
        Me.TxtThEngName.Text = FontStyle.Regular
        Me.TxtThEngName.Clear()
    End Sub

    Private Sub TxtFirEngName_Click(sender As System.Object, e As System.EventArgs) Handles TxtFirEngName.Click
        Me.TxtFirEngName.ForeColor = Color.Black
        Me.TxtFirEngName.Text = FontStyle.Regular
        Me.TxtFirEngName.Clear()
    End Sub

    Private Sub TxtPhoneNo_TextChanged(sender As System.Object, e As System.EventArgs) Handles TxtPhoneNo.TextChanged
        ErrProForm.Clear()
        If IsNumeric(Me.TxtPhoneNo.Text) = False Then
            ErrProForm.SetError(Me.TxtPhoneNo, "رقم هاتف خاطئ")
            Exit Sub
        End If
    End Sub

    Private Sub txtParentPhone_TextChanged(sender As System.Object, e As System.EventArgs) Handles txtParentPhone.TextChanged
        ErrProForm.Clear()
        If IsNumeric(Me.txtParentPhone.Text) = False Then
            ErrProForm.SetError(Me.txtParentPhone, "رقم هاتف خاطئ")
            Exit Sub
        End If
    End Sub

    Private Sub TxtNatioNo_TextChanged(sender As System.Object, e As System.EventArgs) Handles TxtNatioNo.TextChanged
        ErrProForm.Clear()
        If IsNumeric(Me.TxtNatioNo.Text) = False Then
            ErrProForm.SetError(Me.TxtNatioNo, "رقم وطني خاطئ")
            Exit Sub
        End If
    End Sub

    Private Sub TxtEmail_TextChanged(sender As System.Object, e As System.EventArgs) Handles TxtEmail.TextChanged
        ErrProForm.Clear()
        If Me.TxtEmail.Text.Trim.Length = 0 OrElse Me.TxtEmail.Text.Trim.Length > 0 And _
            Not System.Text.RegularExpressions.Regex.IsMatch(Me.TxtEmail.Text.Trim, "^[a-zA-Z][\w\.-]*[a-zA-Z0-9]@[a-zA-Z0-9][\w\.-]*[a-zA-Z0-9]\.[a-zA-Z][a-zA-Z\.]*[a-zA-Z]$") Then
            ErrProForm.SetError(Me.txtParentPhone, "بريد الالكتروني هاتف خاطئ")
            Exit Sub
        End If
    End Sub

    Private Sub txtUniversityID_TextChanged(sender As System.Object, e As System.EventArgs) Handles txtUniversityID.TextChanged

    End Sub
End Class