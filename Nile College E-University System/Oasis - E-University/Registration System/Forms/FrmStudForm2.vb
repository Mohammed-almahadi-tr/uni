
Imports System.Data.SqlClient
Imports EgyCurr

Public Class FrmStudForm2
    Public FileNo, FileNo1 As Integer
    Public dat As DateTime = Now
    Public dat1 As DateTime
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
            While reader.Read
                Me.TxtFAR.Text = reader.Item("StdFirName")
                Me.TxtTHAr.Text = reader.Item("StdTheName")
                Me.TxtSAr.Text = reader.Item("StdSecName")
                Me.TxtForAr.Text = reader.Item("StdForName")
                Me.TxtSchool.Text = reader.Item("StdSchool")
                Me.CombColeg.Text = reader.Item("StdColg")
                Me.CombProgram.Text = reader.Item("StdProgram")
                Me.CmbAdmiTyp.Text = reader.Item("TypeAd")
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
        'Me.CmbAdmiTyp.SelectedItem = Nothing
        'Me.CombColeg.SelectedItem = Nothing
        'Me.CombProgram.SelectedItem = Nothing
        'Me.CombTypeofCer.SelectedItem = Nothing
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
        Me.CombDyana.SelectedItem = -1
        Me.RadFmail.Checked = False
        Me.RadMail.Checked = True
        Me.CombStatus.SelectedItem = -1
        Me.CombNationality.SelectedItem = -1
        Me.TxtEmail.Clear()
        'Me.CombBold.SelectedItem = Nothing
        Me.CheckBox1.Checked = False
        Me.TxtSchool.Clear()
        Me.CmbAdmiTyp.SelectedIndex = -1
        Me.TxtYear.Clear()
        Me.TxtType.Clear()
        Me.TxtSchool.Clear()
        Me.CombColeg.SelectedIndex = -1
        Me.CombProgram.SelectedIndex = -1
        Me.CombProgram.SelectedItem = -1
    End Sub
    Sub loadssss()
        Me.TxtFAR.Text = FAR
        Me.TxtSAr.Text = SAr
        Me.TxtTHAr.Text = THAr
        Me.TxtForAr.Text = ForAr
        Me.TxtFirEngName.Text = FirEngName
        Me.TxtSeEngName.Text = SeEngName
        Me.TxtThEngName.Text = ThEngName
        Me.TxtFoEnName.Text = FoEnName
        Me.CmbAdmiTyp.Text = TypeAD
        Me.TxtYear.Text = Year
        Me.CombColeg.Text = Coleg
        Me.CombProgram.Text = Program
        Me.CombTypeofCer.Text = TypeofCe
        Me.txtUniversityID.Text = UniversityID
        Me.txtPlaceofBirth.Text = PlaceofBirth
        Me.DTPBirthDate.Value = dat
        Me.txtParent.Text = Parent0
        Me.txtParentJob.Text = ParentJob
        Me.txtRelevant.Text = Relevant
        Me.txtParentAddress.Text = ParentAddress
        Me.txtParentPhone.Text = ParentPhone
        Me.TxtPhoneNo.Text = PhoneNo
        Me.txtAddress.Text = Address
        Me.TxtNatioNo.Text = NatioNo
        Me.CombDyana.Text = Dyana
        Me.TxtSchool.Text = school
        Me.TxtEmail.Text = Email
        Me.CombStatus.Text = Status
        Me.CombNationality.Text = Nationality
        Me.TxtSchool.Text = school
        If Gender = 0 Then
            Me.RadFmail.Checked = False
            Me.RadMail.Checked = True
        Else
            Me.RadFmail.Checked = True
            Me.RadMail.Checked = False
        End If

        Me.CombStatus.Text = Status
        Me.CombNationality.Text = Nationality
        Me.TxtEmail.Text = Email
        Me.TxtType.Text = type
    End Sub


    Private Sub FrmForm_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        Me.WindowState = FormWindowState.Maximized
        Me.BtnSave.Enabled = False
        loadssss()
    End Sub

    Private Sub BtnClose_Click(sender As System.Object, e As System.EventArgs)
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

    Private Sub TxtFirEngName_Click(sender As System.Object, e As System.EventArgs)
        Me.TxtFirEngName.ForeColor = Color.Black
        Me.TxtFirEngName.Text = FontStyle.Regular
        Me.TxtFirEngName.Clear()
    End Sub


    Private Sub TxtThEngName_Click(sender As System.Object, e As System.EventArgs)
        Me.TxtThEngName.ForeColor = Color.Black
        Me.TxtThEngName.Text = FontStyle.Regular
        Me.TxtThEngName.Clear()
    End Sub

    Private Sub TxtSeEngName_Click(sender As System.Object, e As System.EventArgs)
        Me.TxtSeEngName.ForeColor = Color.Black
        Me.TxtSeEngName.Text = FontStyle.Regular
        Me.TxtSeEngName.Clear()
    End Sub

    Private Sub TxtFoEnName_Click(sender As System.Object, e As System.EventArgs)
        Me.TxtFoEnName.ForeColor = Color.Black
        Me.TxtFoEnName.Text = FontStyle.Regular
        Me.TxtFoEnName.Clear()
    End Sub

    Private Sub CheckBox1_CheckedChanged(sender As System.Object, e As System.EventArgs)
        Me.Label3.Visible = True
        Me.Label24.Visible = True
        Label3.Text = Me.TxtFAR.Text + "  " + Me.TxtForAr.Text
        If CheckBox1.Checked = False Then
            Me.BtnSave.Enabled = False
        Else
            Me.BtnSave.Enabled = True
        End If
    End Sub


    Private Sub CheckBox1_CheckedChanged_1(sender As System.Object, e As System.EventArgs) Handles CheckBox1.CheckedChanged
        Me.Label3.Visible = True
        Me.Label24.Visible = True
        Label3.Text = Me.TxtFAR.Text + "  " + Me.TxtForAr.Text
        If CheckBox1.Checked = False Then
            Me.BtnSave.Enabled = False
        Else
            Me.BtnSave.Enabled = True
        End If
    End Sub

    Private Sub BtnSave_Click(sender As System.Object, e As System.EventArgs) Handles BtnSave.Click
        Me.ErrProForm.Clear()
        If Me.TxtFAR.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtFAR, "الرجاءادخال الاسم العربي الاول")
            Exit Sub
        ElseIf Me.TxtSAr.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtSAr, "الرجاءادخال الاسم العربي الثاني")
            Exit Sub
        ElseIf Me.TxtTHAr.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtTHAr, "الرجاءادخال الاسم العربي الثالث")
            Exit Sub
        ElseIf Me.TxtFAR.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtFAR, "الرجاءادخال الاسم العربي الرابع")
            '    Exit Sub
        ElseIf Me.TxtFirEngName.Text.Trim.Length = 0 Then
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
            'ElseIf Me.CombColeg.SelectedIndex = -1 Then
            '    Me.ErrProForm.SetError(Me.CombColeg, "الرجاء تحديد الكلية")
            '    Exit Sub
            'ElseIf Me.CombProgram.SelectedIndex = -1 Then
            '    Me.ErrProForm.SetError(Me.CombProgram, "الرجاء تحديد البرنامج")
            '    Exit Sub
        ElseIf Me.CombTypeofCer.SelectedIndex = -1 Then
            Me.ErrProForm.SetError(Me.CombTypeofCer, "الرجاء تحديد نوع الشهادة")
            Exit Sub
        ElseIf Me.txtPlaceofBirth.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtPlaceofBirth, "الرجاءادخال مكان الميلاد")
            Exit Sub
        ElseIf Me.DTPBirthDate.Value = Now Then
            Me.ErrProForm.SetError(Me.DTPBirthDate, "الرجاءمراجعة تاريخ الميلاد")
            Exit Sub
        ElseIf Me.txtUniversityID.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtUniversityID, "الرجاءادخال الرقم الجامعي")
            Exit Sub
        ElseIf Me.CombNationality.SelectedIndex = -1 Then
            Me.ErrProForm.SetError(Me.CombNationality, "الرجاء تحديد الجنسية")
            Exit Sub
        ElseIf Me.txtParent.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParent, "الرجاءادخال اسم ولي الامر ")
            Exit Sub
        ElseIf Me.txtParentJob.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParentJob, "الرجاءادخال مهنة ولي الامر ")
            Exit Sub
        ElseIf Me.txtParentPhone.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParentPhone, "الرجاءادخال هاتف ولي الامر ")
            Exit Sub
        ElseIf Me.txtParentAddress.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtParentAddress, "الرجاءادخال عنوان ولي الامر ")
            Exit Sub
        ElseIf Me.txtRelevant.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtRelevant, "الرجاءادخال صلة القرابة بولي الامر ")
            Exit Sub
        ElseIf Me.TxtPhoneNo.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtPhoneNo, "الرجاءادخال رقم الهاتف ")
            Exit Sub
        ElseIf Me.txtAddress.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.txtAddress, "الرجاءادخال العنوان الحالي ")
            Exit Sub
        ElseIf Me.TxtNatioNo.Text.Trim.Length = 0 Then
            Me.ErrProForm.SetError(Me.TxtNatioNo, "الرجاءادخال الرقم الوطني ")
            Exit Sub
            'ElseIf Me.CombDyana.SelectedIndex = -1 Then
            '    Me.ErrProForm.SetError(Me.CombDyana, "الرجاء تحديد الديانة")
            '    Exit Sub
            'ElseIf Me.TxtEmail.Text.Trim.Length = 0 Then
            '    Me.ErrProForm.SetError(Me.TxtEmail, "الرجاءادخال البريد الالكتروني ")
            '    Exit Sub
        ElseIf Me.CombStatus.SelectedIndex = -1 Then
            Me.ErrProForm.SetError(Me.CombStatus, "الرجاء تحديد الحالة الاجتماعية")
            Exit Sub
            'ElseIf Me.CombBold.SelectedIndex = -1 Then
            '    Me.ErrProForm.SetError(Me.CombBold, "الرجاء تحديد فصيلة الدم")
            '    Exit Sub
        Else

            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmd, cmd1, cmd2 As New SqlCommand()
                Dim Trans As SqlTransaction
                cnn.Open()
                cmd.Connection = cnn
                Trans = cnn.BeginTransaction
                cmd.Transaction = Trans
                cmd.CommandText = "Select IsNull(Max(FileNo),0) from StdForm"

                FileNo1 = CInt(cmd.ExecuteScalar)
                FileNo = FileNo1 + 1
                If FileNo = 1 Or 0 Then
                    dat = Now
                Else
                    ' cmd.CommandText = "Select Max(RegDate) from StdForm Where  FileNo='" & FileNo1 & "'"
                    cmd.CommandText = "Select IsNull(Max(RegDate),0) from StdForm Where Coleg=N'" & Me.CombColeg.Text & "'  "
                    dat1 = CDate(cmd.ExecuteScalar)

                    If (dat.Hour = 10 And dat.Minute = 30) Or dat.Hour = 12 Then
                        ' dat = dat.AddDays(1)
                        dat.AddMinutes(30)
                    Else
                        dat = dat1.AddMinutes(10)
                    End If
                    Dim s As Date = dat
                End If
                cmd.CommandText = "Insert Into StdForm (FileNo,RegDate,UnivID,StdFiNaA,StdSNaA,StdThNaA,StdFoNaA,StdFiNaE,StdSNaE,StdThNaE,StdFoNaE,TypeofAdmission,Type,Coleg,Program,TypeofCertificate,PlaceofBirth,BirthDate,Nationality,Parent,JobofParent,Relevant,ParentAddress,ParentPhone,StudentPhoneNo,StudentAddress,NatioNo,Dyana,Email,Year,status,Gender,SavedUser)" & _
                                                " Values (@FileNo,@RegDate,@UnivID,@StdFiNaA,@StdSNaA,@StdThNaA,@StdFoNaA,@StdFiNaE,@StdSNaE,@StdThNaE,@StdFoNaE,@TypeofAdmission,@Type,@Coleg,@Program,@TypeofCertificate,@PlaceofBirth,@BirthDate,@Nationality,@Parent,@JobofParent,@Relevant,@ParentAddress,@ParentPhone,@StudentPhoneNo,@StudentAddress,@NatioNo,@Dyana,@Email,@Year,@status,@Gender,@SavedUser) "

                'Add values
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@FileNo", FileNo)
                cmd.Parameters.AddWithValue("@RegDate", dat)
                cmd.Parameters.AddWithValue("@UnivID", Me.txtUniversityID.Text.Trim)
                cmd.Parameters.AddWithValue("@StdFiNaA", Me.TxtFAR.Text.Trim)
                cmd.Parameters.AddWithValue("@StdSNaA", Me.TxtSAr.Text.Trim)
                cmd.Parameters.AddWithValue("@StdThNaA", Me.TxtTHAr.Text.Trim)
                cmd.Parameters.AddWithValue("@StdFoNaA", Me.TxtForAr.Text.Trim)
                cmd.Parameters.AddWithValue("@StdFiNaE", Me.TxtFirEngName.Text.Trim)
                cmd.Parameters.AddWithValue("@StdSNaE", Me.TxtSeEngName.Text.Trim)
                cmd.Parameters.AddWithValue("@StdThNaE", Me.TxtThEngName.Text.Trim)
                cmd.Parameters.AddWithValue("@StdFoNaE", Me.TxtFoEnName.Text.Trim)
                'cmd.Parameters.AddWithValue("@TypeofAdmission", Me.CmbAdmiTyp.Text.Trim)

                Dim typ As Integer
                If Me.TxtType.Text.Trim = "دبلوم" Then
                    typ = 0
                Else
                    typ = 1
                End If
                cmd.Parameters.AddWithValue("@Type", (typ))

                cmd.Parameters.AddWithValue("@Coleg", Me.CombColeg.Text)
                cmd.Parameters.AddWithValue("@Program", Me.CombProgram.Text)
                cmd.Parameters.AddWithValue("@TypeofCertificate", Me.CombTypeofCer.SelectedItem)
                cmd.Parameters.AddWithValue("@PlaceofBirth", Me.txtPlaceofBirth.Text.Trim)
                cmd.Parameters.AddWithValue("@BirthDate", Me.DTPBirthDate.Value)
                cmd.Parameters.AddWithValue("@Nationality", Me.CombNationality.SelectedItem)
                cmd.Parameters.AddWithValue("@Parent", Me.txtParent.Text.Trim)
                cmd.Parameters.AddWithValue("@JobofParent", Me.txtParentJob.Text.Trim)
                cmd.Parameters.AddWithValue("@Relevant", Me.txtRelevant.Text.Trim)
                cmd.Parameters.AddWithValue("@ParentAddress", Me.txtParentAddress.Text.Trim)
                cmd.Parameters.AddWithValue("@ParentPhone", Me.txtParentPhone.Text.Trim)
                cmd.Parameters.AddWithValue("@StudentPhoneNo", Me.TxtPhoneNo.Text.Trim)
                cmd.Parameters.AddWithValue("@StudentAddress", Me.txtAddress.Text.Trim)
                cmd.Parameters.AddWithValue("@NatioNo", Me.TxtNatioNo.Text.Trim)
                cmd.Parameters.AddWithValue("@Dyana", Me.CombDyana.Text)
                cmd.Parameters.AddWithValue("@Email", Me.TxtEmail.Text.Trim)
                If RadMail.Checked = True Then
                    cmd.Parameters.AddWithValue("@Gender", CInt(0))
                Else
                    cmd.Parameters.AddWithValue("@Gender", CInt(1))
                End If
                cmd.Parameters.AddWithValue("@status", Me.CombStatus.SelectedItem)
                'cmd.Parameters.AddWithValue("@Bold", Me.CombBold.SelectedItem)
                cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                cmd.Parameters.AddWithValue("@Year", Me.TxtYear.Text)

                If Me.CmbAdmiTyp.Text = "قبول عام" Then
                    cmd.Parameters.AddWithValue("@TypeofAdmission", CInt(0))
                End If

                If Me.CmbAdmiTyp.Text = "قبول خاص" Then
                    cmd.Parameters.AddWithValue("@TypeofAdmission", CInt(1))
                End If

                If Me.CmbAdmiTyp.Text = "ابناء عاملين" Then
                    cmd.Parameters.AddWithValue("@TypeofAdmission", CInt(2))
                End If

                If Me.CmbAdmiTyp.Text = "وافدين" Then
                    cmd.Parameters.AddWithValue("@TypeofAdmission", CInt(3))
                End If
               
                
                cmd.ExecuteNonQuery()
                Trans.Commit()
                cnn.Close()
                'cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                MsgBox("تم الحفظ")
                'SNo = Me.txtUniversityID.Text
                print(FileNo)
                Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub BtnClose_Click_1(sender As System.Object, e As System.EventArgs) Handles BtnClose.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(sender As System.Object, e As System.EventArgs) Handles Button2.Click
        Dim a As New FrmForm
        a.Show()
        Me.Close()
    End Sub

    Private Sub Button1_Click(sender As System.Object, e As System.EventArgs) Handles Button1.Click

    End Sub
End Class